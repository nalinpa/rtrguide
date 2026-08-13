export const COL = {
  users: "users",
} as const;

export type CollectionName = (typeof COL)[keyof typeof COL];