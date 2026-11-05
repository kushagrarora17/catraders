import {app} from "@azure/functions";
import {processReview} from "./processor";

app.storageQueue("contentReview", {
  queueName: "content-review", connection: "ReviewQueue", handler: processReview,
});
