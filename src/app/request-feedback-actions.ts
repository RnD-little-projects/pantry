"use server";

import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { connectMongo } from "@/lib/db/mongodb";
import { Feedback, ItemRequest } from "@/models";

export type PublicItemRequest = {
  id: string;
  name: string;
  normalizedName: string;
  note: string;
  status: "pending" | "available" | "unavailable" | "added";
  staffNote: string;
  requester: string;
  /** Requester plus everyone who liked it */
  wants: number;
  mine: boolean;
  likedByMe: boolean;
  createdAt: string;
};

type Result = { success: true; liked?: boolean } | { success: false; error: string };

const FEEDBACK_CATEGORIES = ["bug", "idea", "other"] as const;
// A request for the same item while one of these exists becomes a like instead of a duplicate
const OPEN_STATUSES = ["pending", "available", "unavailable"];

async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Stops a stuck button or a script from flooding the collection
async function tooMany(model: typeof ItemRequest, field: string, userId: string) {
  const since = new Date(Date.now() - 60_000);
  return (await model.countDocuments({ [field]: userId, createdAt: { $gt: since } })) >= 3;
}

export async function submitItemRequestAction(input: { name: string; note?: string }): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "Sign in to request an item." };

  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const note = String(input.note ?? "").trim();
  if (!name) return { success: false, error: "Type the item you want." };
  if (name.length > 80) return { success: false, error: "Keep the item name under 80 characters." };
  if (note.length > 300) return { success: false, error: "Keep the note under 300 characters." };

  await connectMongo();
  const normalizedName = name.toLowerCase();
  const existing = await ItemRequest.findOne({ normalizedName, status: { $in: OPEN_STATUSES } });
  if (existing) {
    if (String(existing.requesterId) === userId) return { success: false, error: "You already requested this." };
    await ItemRequest.updateOne({ _id: existing._id }, { $addToSet: { likes: userId } });
    revalidatePath("/admin/requests");
    return { success: true, liked: true };
  }

  if (await tooMany(ItemRequest, "requesterId", userId)) {
    return { success: false, error: "Too many requests. Wait a minute and try again." };
  }

  await ItemRequest.create({ requesterId: userId, name, normalizedName, note });
  revalidatePath("/admin/requests");
  return { success: true };
}

export async function toggleItemRequestLikeAction(id: string): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "Sign in to like a request." };
  if (!isValidObjectId(id)) return { success: false, error: "That request doesn't exist." };

  await connectMongo();
  const request = await ItemRequest.findById(id, { requesterId: 1, likes: 1, status: 1 }).lean<{
    requesterId: unknown;
    likes: unknown[];
    status: string;
  }>();
  if (!request || request.status === "added") return { success: false, error: "That request is closed." };
  if (String(request.requesterId) === userId) return { success: false, error: "This is your own request." };

  const liked = request.likes.some((l) => String(l) === userId);
  await ItemRequest.updateOne({ _id: id }, liked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } });
  revalidatePath("/admin/requests");
  return { success: true, liked: !liked };
}

// Every user sees every request, so people can like instead of asking again
export async function getItemRequestsAction(): Promise<PublicItemRequest[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  await connectMongo();
  // shortcut: only the 150 most recently touched requests are listed; add search on the server if that's too few
  const rows = await ItemRequest.find({})
    .sort({ updatedAt: -1 })
    .limit(150)
    .populate("requesterId", "username")
    .lean();

  return (rows as Record<string, unknown>[]).map((r) => {
    const requester = r.requesterId as { _id: unknown; username?: string } | null;
    const likes = (r.likes as unknown[] | undefined) ?? [];
    return {
      id: String(r._id),
      name: String(r.name),
      normalizedName: String(r.normalizedName),
      note: String(r.note ?? ""),
      status: r.status as PublicItemRequest["status"],
      staffNote: String(r.staffNote ?? ""),
      requester: requester?.username ?? "someone",
      wants: likes.length + 1,
      mine: String(requester?._id) === userId,
      likedByMe: likes.some((l) => String(l) === userId),
      createdAt: (r.createdAt as Date).toISOString(),
    };
  });
}

export async function submitFeedbackAction(input: {
  category: string;
  rating: number | null;
  message: string;
  page?: string;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: "Sign in to send feedback." };

  const message = String(input.message ?? "").trim();
  const category = FEEDBACK_CATEGORIES.includes(input.category as never) ? input.category : "other";
  const rating = Number.isInteger(input.rating) && input.rating! >= 1 && input.rating! <= 5 ? input.rating : null;
  const page = String(input.page ?? "").startsWith("/") ? String(input.page).slice(0, 200) : "";
  if (!message) return { success: false, error: "Write a message first." };
  if (message.length > 2000) return { success: false, error: "Keep it under 2000 characters." };

  await connectMongo();
  if (await tooMany(Feedback, "userId", userId)) {
    return { success: false, error: "Too much feedback at once. Wait a minute and try again." };
  }

  await Feedback.create({ userId, category, rating, message, page });
  revalidatePath("/admin/feedback");
  return { success: true };
}
