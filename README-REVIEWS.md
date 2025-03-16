# Reviews Feature Documentation

This document provides an overview of the Reviews feature for the Netflix-like application.

## Overview

The Reviews feature allows users to:
- Write reviews for movies and TV shows
- Rate media on a scale of 0-5 stars
- Make reviews public or private
- Mark reviews as containing spoilers
- Like other users' reviews
- View top-rated media based on user reviews

## Data Model

### Review Schema

The Review model includes the following fields:

- **user**: Reference to the User who wrote the review
- **profile**: Reference to the Profile used to write the review
- **media**: Reference to the Media being reviewed
- **rating**: Number from 0-5 (0 means no rating, just a text review)
- **isPublic**: Boolean flag for public/private reviews
- **content**: Text content of the review
- **likes**: Number of likes the review has received
- **spoiler**: Boolean flag to mark reviews containing spoilers
- **createdAt/updatedAt**: Timestamps for when the review was created/updated

### Media Schema Updates

The Media model has been updated with a `userRating` field that contains:
- **average**: Average rating from all user reviews
- **count**: Total number of reviews

## API Endpoints

### Review Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/reviews/top-rated` | Get top-rated media based on reviews | No |
| GET | `/reviews/media/:mediaId` | Get all reviews for a specific media | No (public only) / Yes (all) |
| GET | `/reviews/:reviewId` | Get a specific review by ID | No (if public) / Yes (if private) |
| GET | `/reviews/user/:userId` | Get all public reviews by a user | No |
| GET | `/reviews/my-reviews` | Get current user's reviews (both public and private) | Yes |
| POST | `/reviews` | Create a new review | Yes |
| PUT | `/reviews/:reviewId` | Update a review | Yes (owner only) |
| DELETE | `/reviews/:reviewId` | Delete a review | Yes (owner or admin) |
| POST | `/reviews/:reviewId/like` | Like a review | Yes |

### Media Endpoints (Review-related)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/media/top-rated-by-users` | Get top-rated media based on user reviews | No |
| PATCH | `/media/ratings/:mediaId` | Update user ratings for a media item | Yes (admin only) |

## Features

### Rating Aggregation

The system automatically calculates and updates the average rating for each media item when:
- A new review is created
- An existing review is updated
- A review is deleted

### Top-Rated Media

The system provides two ways to get top-rated media:
1. **Based on TMDB ratings**: `/media/top-rated`
2. **Based on user reviews**: `/media/top-rated-by-users`

### Public vs Private Reviews

- Public reviews are visible to all users
- Private reviews are only visible to the user who created them
- The API automatically filters out private reviews when fetching reviews for a media item or user

### Review Sorting

Reviews can be sorted by:
- Recent (default)
- Rating (high to low)
- Rating (low to high)
- Likes

## Usage Examples

### Creating a Review

```javascript
// POST /reviews
{
  "mediaId": "60d21b4667d0d8992e610c85",
  "profileId": "60d21b4667d0d8992e610c86",
  "rating": 4,
  "content": "This movie was great! Highly recommended.",
  "isPublic": true,
  "spoiler": false
}
```

### Getting Reviews for a Media Item

```
GET /reviews/media/60d21b4667d0d8992e610c85?page=1&limit=10&sort=recent
```

### Getting Top-Rated Media

```
GET /media/top-rated-by-users?limit=10&mediaType=movie
```

## Testing

To test the Reviews feature, run:

```bash
npm run test:reviews
```

This will:
1. Create test reviews
2. Test the rating aggregation
3. Test the top-rated media functionality

## Implementation Notes

- Reviews are stored in their own collection for better scalability
- Compound indexes ensure efficient querying
- MongoDB aggregation pipeline is used for complex operations like calculating average ratings
- The system ensures a user can only review a media item once (enforced by a unique compound index) 