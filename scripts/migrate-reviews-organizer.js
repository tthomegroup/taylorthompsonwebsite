const fs = require("fs");
const path = require("path");
const { ORGANIZER_FILE, readLegacyReviews } = require("./build-reviews");

const reviews = readLegacyReviews();
const organizer = {
  reviews: reviews.map(cleanReview),
};

fs.mkdirSync(path.dirname(ORGANIZER_FILE), { recursive: true });
fs.writeFileSync(ORGANIZER_FILE, `${JSON.stringify(organizer, null, 2)}\n`);
console.log(`Migrated ${reviews.length} review(s) into the drag-and-drop organizer.`);

function cleanReview(review) {
  return {
    id: review.id,
    author: review.author,
    text: review.text,
    detail: review.detail,
    source: review.source,
    rating: review.rating,
  };
}
