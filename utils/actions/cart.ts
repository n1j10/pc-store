"use server";
import { redirect } from "next/navigation";
import db from "../db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Cart } from "@/utils/type";
import { getAuthUser } from "./user";
import { renderError } from "./global";
import { fetchSingleProduct } from "./products";

// ================= Cart Actions =================

const MAX_ITEM_AMOUNT = 20;

// Quantities come from the client, so they must be whole numbers in range;
// a negative amount would otherwise reduce the order total.
const parseAmount = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_ITEM_AMOUNT) {
    throw new Error(`Amount must be between 1 and ${MAX_ITEM_AMOUNT}`);
  }
  return amount;
};

export const fetchCartItems = async () => {
  const { userId } = await auth();
  if (!userId) return 0;
  const cart = await db.cart.findFirst({
    where: { clerkId: userId },
    select: { numItemsInCart: true },
  });
  return cart?.numItemsInCart || 0;
};

const includeProductClause = {
  cartItems: {
    include: { product: true },
  },
};

export const fetchOrCreateCart = async ({
  userId,
  errorOnFailure = false,
}: {
  userId: string;
  errorOnFailure?: boolean;
}) => {
  let cart = await db.cart.findFirst({
    where: { clerkId: userId },
    include: includeProductClause,
  });
  if (!cart && errorOnFailure) {
    throw new Error("Cart not found");
  }
  if (!cart) {
    cart = await db.cart.create({
      data: { clerkId: userId },
      include: includeProductClause,
    });
  }
  return cart;
};

const updateOrCreateCartItem = async ({
  productId,
  cartId,
  amount,
}: {
  productId: string;
  cartId: string;
  amount: number;
}) => {
  let cartItem = await db.cartItem.findFirst({
    where: { productId, cartId },
  });
  if (cartItem) {
    cartItem = await db.cartItem.update({
      where: { id: cartItem.id },
      data: { amount: Math.min(cartItem.amount + amount, MAX_ITEM_AMOUNT) },
    });
  } else {
    cartItem = await db.cartItem.create({
      data: { amount, productId, cartId },
    });
  }
};

export const updateCart = async (cart: Cart) => {
  const cartItems = await db.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });

  let numItemsInCart = 0;
  let cartTotal = 0;

  for (const item of cartItems) {
    numItemsInCart += item.amount;
    cartTotal += item.amount * item.product.price;
  }
  const orderTotal = cartTotal;

  const currentCart = await db.cart.update({
    where: { id: cart.id },
    data: { numItemsInCart, orderTotal, cartTotal },
    include: includeProductClause,
  });
  return { cartItems, currentCart };
};

export const addToCartAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser();
  try {
    const productId = formData.get("productId") as string;
    const amount = parseAmount(formData.get("amount"));
    await fetchSingleProduct(productId);
    const cart = await fetchOrCreateCart({ userId: user.id });
    await updateOrCreateCartItem({ productId, cartId: cart.id, amount });
    await updateCart(cart);
  } catch (error) {
    return renderError(error);
  }
  redirect("/cart");
};

export const removeCartItemAction = async (
  prevState: any,
  formData: FormData,
) => {
  const user = await getAuthUser();
  try {
    const cartItemId = formData.get("id") as string;
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    await db.cartItem.delete({
      where: { id: cartItemId, cartId: cart.id },
    });
    await updateCart(cart);
    revalidatePath("/cart");
    return { message: "Item removed from cart" };
  } catch (error) {
    return renderError(error);
  }
};

export const updateCartItemAction = async ({
  amount,
  cartItemId,
}: {
  amount: number;
  cartItemId: string;
}) => {
  const user = await getAuthUser();
  try {
    const cart = await fetchOrCreateCart({
      userId: user.id,
      errorOnFailure: true,
    });
    await db.cartItem.update({
      where: { id: cartItemId, cartId: cart.id },
      data: { amount: parseAmount(amount) },
    });
    await updateCart(cart);
    revalidatePath("/cart");
    return { message: "cart updated" };
  } catch (error) {
    return renderError(error);
  }
};
