"use server";
import db from "../db";
import { reviewSchema } from "../schema";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "./user";
import { renderError } from "./global";

export const creatReviewAction = async (prevState: any, formData: FormData) => {
  const user = await getAuthUser();
  try {
    const rawData = Object.fromEntries(formData);
    const validatedFields = reviewSchema.safeParse(rawData);
    if (!validatedFields.success) {
      const errors = validatedFields.error?.issues.map((error) => error.message);
      return { message: "Error" + errors?.join(",") };
    }
    const { productId } = validatedFields.data;
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new Error("Product not found");
    const existing = await db.review.findFirst({ where: { productId, clerkId: user.id } });
    if (existing) throw new Error("You have already reviewed this product");
    await db.review.create({
      data: {
        ...validatedFields.data,
        clerkId: user.id,
        authorName: user.firstName || user.username || "Customer",
        authorImageUrl: user.imageUrl,
      },
    });
    revalidatePath(`/products/${validatedFields.data.productId}`);
    return { message: "review submitted successfully" };
  } catch (error) {
    return renderError(error);
  }
};

export const fetchProductReview = async (productId: string) => {
  const review = await db.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  });
  return review;
};

export const fetchAllReviews = async () => {
  return db.review.findMany({
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
};

