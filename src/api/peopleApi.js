import { api } from "./client";

// Following people (2026-11-23, item 6). People who play are found by name (3+ letters); following works at once.

/** [{ userId, name, photoUrl, line, isFollowing, followsMe, isMe }] */
export const searchPeople = (q) => api.call("PEOPLE_SEARCH", { query: { q } });

/** { userId, follow: { followers, following, isFollowing, followsMe } } */
export const followPerson = (userId) => api.call("PERSON_FOLLOW", { routeParams: { userId } });
export const unfollowPerson = (userId) => api.call("PERSON_UNFOLLOW", { routeParams: { userId } });

/** { userId, name, followers, following, isMine, items: [person] } */
export const getFollowers = (userId) => api.call("PERSON_FOLLOWERS", { routeParams: { userId } });
export const getFollowing = (userId) => api.call("PERSON_FOLLOWING", { routeParams: { userId } });

/** One of your followers stops following you (not told); answers your followers. */
export const removeFollower = (userId) => api.call("PERSON_FOLLOWER_REMOVE", { routeParams: { userId } });
