import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth } from "./auth";
import passport from "passport";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { randomUUID, randomInt } from "crypto";
import { sendVerificationEmail, sendOrderNotification, sendOrderConfirmationToCustomer } from "./email";

const SHIPPING_RATES: Record<string, number> = {
  westBank: 20,
  jerusalem: 30,
  interior: 75,
};
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const { hashPassword } = setupAuth(app);

  app.use("/uploads", (await import("express")).default.static(path.join(process.cwd(), "uploads")));

  app.post("/api/upload", (req, res, next) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  }, (req, res, next) => {
    upload.array("images", 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File too large. Max 10MB per image." });
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ message: "Too many files. Max 10 images." });
        }
        return res.status(400).json({ message: err.message });
      }
      if (err) {
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const urls = files.map(f => `/uploads/${f.filename}`);
    res.json({ urls });
  });

  // Seed DB with mock data if needed
  async function seed() {
    const categories = await storage.getCategories();
    if (categories.length === 0) {
      const dressesCat = await storage.createCategory({ name: "Dresses", slug: "dresses" });
      const topsCat = await storage.createCategory({ name: "Tops & Blouses", slug: "tops" });
      const pantsCat = await storage.createCategory({ name: "Pants & Skirts", slug: "pants-skirts" });
      const shoesCat = await storage.createCategory({ name: "Shoes", slug: "shoes" });
      const bagsCat = await storage.createCategory({ name: "Bags", slug: "bags" });
      const accessoriesCat = await storage.createCategory({ name: "Accessories", slug: "accessories" });
    }

    const adminUser = await storage.getUserByEmail("admin@lucerne.com");
    if (!adminUser) {
      await storage.createUser({
        email: "admin@lucerne.com",
        password: await hashPassword("admin123"),
        role: "admin",
        fullName: "Store Admin",
        isVerified: true,
      });
    }
  }
  
  // Call seed on start (fire and forget)
  seed().catch(console.error);

  // --- Auth Routes ---
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existingUser = await storage.getUserByEmail(input.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
        role: "customer",
        isVerified: true,
      });

      req.login(user, (loginErr) => {
        if (loginErr) return res.status(500).json({ message: "Login failed" });
        const { password, verificationCode: _vc, ...userWithoutSensitive } = user;
        res.status(201).json(userWithoutSensitive);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: "Internal server error" });
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      req.login(user, (loginErr) => {
        if (loginErr) return res.status(500).json({ message: "Login failed" });
        const { password, verificationCode: _vc, ...userWithoutSensitive } = user;
        res.json(userWithoutSensitive);
      });
    })(req, res, next);
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { password, verificationCode: _vc, ...userWithoutSensitive } = req.user as any;
    res.json(userWithoutSensitive);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  // --- Product Routes ---
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), input);
      if (!product) return res.status(404).json({ message: "Not found" });
      res.json(product);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const success = await storage.deleteProduct(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Not found" });
    res.status(204).send();
  });

  // --- Categories ---
  app.get(api.categories.list.path, async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  // --- Orders ---
  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    
    if (user.role === 'admin') {
      const orders = await storage.getOrders();
      res.json(orders);
    } else {
      const orders = await storage.getUserOrders(user.id);
      res.json(orders);
    }
  });

  app.get(api.orders.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const orderData = await storage.getOrder(Number(req.params.id));
    
    if (!orderData) return res.status(404).json({ message: "Not found" });
    
    const user = req.user as any;
    if (user.role !== 'admin' && orderData.order.userId !== user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    res.json(orderData);
  });

  app.post(api.orders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "يجب تسجيل الدخول لإتمام الطلب" });
    try {
      const input = api.orders.create.input.parse(req.body);
      const userId = (req.user as any).id;

      for (const item of input.items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product ${item.productId} not found` });
        }
        const colorVariants = ((product as any).colorVariants || []) as Array<{name: string; sizes: string[]; sizeInventory: Record<string, number>}>;
        const itemColor = (item as any).color;
        const itemSize = (item as any).size;

        if (colorVariants.length > 0) {
          if (!itemColor) {
            return res.status(400).json({ message: `Color is required for ${product.name}` });
          }
          const variant = colorVariants.find(v => v.name === itemColor);
          if (!variant) {
            return res.status(400).json({ message: `Color ${itemColor} not available for ${product.name}` });
          }
          const vInv = variant.sizeInventory || {};
          const hasSizes = Object.keys(vInv).length > 0;
          if (hasSizes) {
            if (!itemSize) {
              return res.status(400).json({ message: `Size is required for ${product.name} in ${itemColor}` });
            }
            if (vInv[itemSize] === undefined) {
              return res.status(400).json({ message: `Size ${itemSize} not available for ${product.name} in ${itemColor}` });
            }
            if (vInv[itemSize] < item.quantity) {
              return res.status(400).json({ message: `Not enough stock for ${product.name} ${itemColor} size ${itemSize}` });
            }
          } else {
            const variantTotal = Object.values(vInv).reduce((s, q) => s + q, 0);
            if (variantTotal < item.quantity) {
              return res.status(400).json({ message: `Not enough stock for ${product.name} in ${itemColor}` });
            }
          }
        } else {
          const inv = (product.sizeInventory as Record<string, number>) || {};
          if (itemSize && Object.keys(inv).length > 0) {
            if (inv[itemSize] === undefined) {
              return res.status(400).json({ message: `Size ${itemSize} not available for ${product.name}` });
            }
            if (inv[itemSize] < item.quantity) {
              return res.status(400).json({ message: `Not enough stock for ${product.name} size ${itemSize}` });
            }
          } else {
            if (product.stockQuantity < item.quantity) {
              return res.status(400).json({ message: `Not enough stock for ${product.name}` });
            }
          }
        }
      }
      
      const region = (input.order as any).shippingRegion as string | undefined;
      if (!region || !SHIPPING_RATES[region]) {
        return res.status(400).json({ message: "Invalid or missing shipping region" });
      }
      const serverShippingCost = SHIPPING_RATES[region];

      const verifiedItems: { productId: number; quantity: number; price: string; size?: string | null; color?: string | null }[] = [];
      let subtotal = 0;
      for (const item of input.items) {
        const product = await storage.getProduct(item.productId);
        if (!product) continue;
        const dbPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
        verifiedItems.push({ ...item, price: dbPrice.toString() });
        subtotal += dbPrice * item.quantity;
      }

      const totalAmount = subtotal + serverShippingCost;
      
      const order = await storage.createOrder({
        ...input.order,
        userId,
        totalAmount: totalAmount.toString(),
        shippingCost: serverShippingCost.toString(),
        shippingRegion: region,
        status: "Pending",
      }, verifiedItems);

      const itemDetails = verifiedItems.map((item) => {
        return {
          name: `Product #${item.productId}`,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        };
      });
      
      const productNames = await Promise.all(verifiedItems.map(async (item) => {
        const product = await storage.getProduct(item.productId);
        return product?.name || `Product #${item.productId}`;
      }));
      itemDetails.forEach((d, i) => { d.name = productNames[i]; });

      sendOrderNotification({
        orderId: order.id,
        customerName: input.order.fullName,
        phone: input.order.phone,
        address: input.order.address,
        city: input.order.city,
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: input.order.paymentMethod || "Cash on delivery",
        items: itemDetails,
      }).catch(console.error);

      const customerUser = await storage.getUser(userId);
      if (customerUser?.email) {
        sendOrderConfirmationToCustomer(customerUser.email, {
          orderId: order.id,
          customerName: input.order.fullName,
          phone: input.order.phone,
          address: input.order.address,
          city: input.order.city,
          totalAmount: totalAmount.toFixed(2),
          shippingCost: serverShippingCost.toString(),
          shippingRegion: region || "",
          paymentMethod: input.order.paymentMethod || "Cash on delivery",
          items: itemDetails,
        }).catch(console.error);
      }
      
      res.status(201).json(order);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const input = api.orders.updateStatus.input.parse(req.body);
      const order = await storage.updateOrderStatus(Number(req.params.id), input.status);
      if (!order) return res.status(404).json({ message: "Not found" });
      res.json(order);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  // --- Admin Stats ---
  app.get(api.stats.admin.path, async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const stats = await storage.getStats();
    res.json(stats);
  });

  // --- Reviews ---
  app.get(api.reviews.list.path, async (req, res) => {
    const productId = Number(req.params.productId);
    const reviews = await storage.getReviews(productId);
    res.json(reviews);
  });

  app.post(api.reviews.create.path, async (req, res) => {
    try {
      const input = api.reviews.create.input.parse(req.body);
      const review = await storage.createReview(input);
      res.status(201).json(review);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  // --- Wishlist ---
  app.get(api.wishlist.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getWishlist((req.user as any).id);
    res.json(items);
  });

  app.post(api.wishlist.add.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.wishlist.add.input.parse(req.body);
      const item = await storage.addToWishlist((req.user as any).id, input.productId);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.delete(api.wishlist.remove.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const success = await storage.removeFromWishlist(Number(req.params.id));
    if (!success) return res.status(404).json({ message: "Not found" });
    res.status(204).send();
  });

  // --- Discount Codes ---
  app.post(api.discounts.validate.path, async (req, res) => {
    try {
      const input = api.discounts.validate.input.parse(req.body);
      const discount = await storage.validateDiscountCode(input.code);
      if (!discount) return res.status(404).json({ message: "Invalid or expired code" });
      res.json(discount);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  // --- Stripe Routes ---
  app.get(api.stripe.publishableKey.path, async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err) {
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  app.post(api.stripe.createCheckout.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "يجب تسجيل الدخول لإتمام الطلب" });
    try {
      const input = api.stripe.createCheckout.input.parse(req.body);
      const userId = (req.user as any).id;

      const verifiedItems: any[] = [];
      const lineItems = await Promise.all(input.items.map(async (item) => {
        const product = await storage.getProduct(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);
        const dbPrice = product.discountPrice ? Number(product.discountPrice) : Number(product.price);
        const unitAmount = Math.round(dbPrice * 100);
        const sizePart = item.size ? ` - ${item.size}` : "";
        const colorPart = item.color ? ` (${item.color})` : "";
        verifiedItems.push({ ...item, price: dbPrice.toString() });
        return {
          price_data: {
            currency: "ils",
            product_data: {
              name: `${product.name}${sizePart}${colorPart}`,
              images: product.mainImage ? [product.mainImage.startsWith("http") ? product.mainImage : `https://${req.headers.host}${product.mainImage}`] : [],
            },
            unit_amount: unitAmount,
          },
          quantity: item.quantity,
        };
      }));

      const stripeCheckoutRegion = input.order.shippingRegion;
      if (!stripeCheckoutRegion || !SHIPPING_RATES[stripeCheckoutRegion]) {
        return res.status(400).json({ message: "Invalid or missing shipping region" });
      }
      const stripeCheckoutShipping = SHIPPING_RATES[stripeCheckoutRegion];

      if (stripeCheckoutShipping > 0) {
        lineItems.push({
          price_data: {
            currency: "ils",
            product_data: {
              name: "Shipping / الشحن",
              images: [],
            },
            unit_amount: Math.round(stripeCheckoutShipping * 100),
          },
          quantity: 1,
        });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${req.headers.host}`;

      const metadata: Record<string, string> = {
        orderData: JSON.stringify({
          ...input.order,
          userId,
          paymentMethod: "Card",
        }),
        itemsData: JSON.stringify(verifiedItems),
      };

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
        metadata,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      res.status(400).json({ message: err.message || "Failed to create checkout session" });
    }
  });

  const processedStripeSessions = new Set<string>();

  app.get("/api/stripe/checkout-success", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      if (!sessionId) return res.status(400).json({ message: "Missing session_id" });

      if (processedStripeSessions.has(sessionId)) {
        const existingOrders = await storage.getOrders();
        const existingOrder = existingOrders.find((o: any) => o.stripeSessionId === sessionId);
        if (existingOrder) return res.json({ order: existingOrder });
        return res.status(409).json({ message: "Session already processed" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== "paid") {
        return res.status(400).json({ message: "Payment not completed" });
      }

      processedStripeSessions.add(sessionId);

      const orderData = JSON.parse(session.metadata?.orderData || "{}");
      const itemsData = JSON.parse(session.metadata?.itemsData || "[]");

      const subtotal = itemsData.reduce((acc: number, item: any) => acc + (Number(item.price) * item.quantity), 0);
      const stripeRegion = orderData.shippingRegion as string | undefined;
      const stripeShippingCost = stripeRegion && SHIPPING_RATES[stripeRegion] ? SHIPPING_RATES[stripeRegion] : 0;
      const totalAmount = subtotal + stripeShippingCost;

      const order = await storage.createOrder({
        fullName: orderData.fullName,
        phone: orderData.phone,
        address: orderData.address,
        city: orderData.city,
        notes: orderData.notes || null,
        userId: orderData.userId,
        totalAmount: totalAmount.toFixed(2),
        shippingCost: stripeShippingCost.toString(),
        shippingRegion: stripeRegion || null,
        status: "Pending",
        paymentMethod: "Card",
      }, itemsData);

      const itemDetails = await Promise.all(itemsData.map(async (item: any) => {
        const product = await storage.getProduct(item.productId);
        return {
          name: product?.name || `Product #${item.productId}`,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          color: item.color,
        };
      }));

      sendOrderNotification({
        orderId: order.id,
        customerName: orderData.fullName,
        phone: orderData.phone,
        address: orderData.address,
        city: orderData.city,
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: "Card (Stripe)",
        items: itemDetails,
      }).catch(console.error);

      if (orderData.userId) {
        const customerUser = await storage.getUser(orderData.userId);
        if (customerUser?.email) {
          sendOrderConfirmationToCustomer(customerUser.email, {
            orderId: order.id,
            customerName: orderData.fullName,
            phone: orderData.phone,
            address: orderData.address,
            city: orderData.city,
            totalAmount: totalAmount.toFixed(2),
            shippingCost: stripeShippingCost.toString(),
            shippingRegion: stripeRegion || "",
            paymentMethod: "Card (Stripe)",
            items: itemDetails,
          }).catch(console.error);
        }
      }

      res.json({ order });
    } catch (err: any) {
      console.error("Stripe success handler error:", err);
      res.status(500).json({ message: "Failed to process payment confirmation" });
    }
  });

  return httpServer;
}