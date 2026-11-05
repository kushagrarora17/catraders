import { DefaultAzureCredential } from "@azure/identity";
import { QueueClient } from "@azure/storage-queue";

let queue: QueueClient | undefined;
function reviewQueue() {
  const url = process.env.CONTENT_REVIEW_QUEUE_URL;
  if (!url) throw new Error("CONTENT_REVIEW_QUEUE_URL is not configured");
  return queue ??= new QueueClient(url, new DefaultAzureCredential());
}

export async function enqueueReview(id: string, delay = 60) {
  await reviewQueue().sendMessage(Buffer.from(JSON.stringify({ id })).toString("base64"), { visibilityTimeout: delay });
}
