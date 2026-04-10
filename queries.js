export const getTasks = async (arg, context) => {
  // Allow unauthenticated use of the app by returning an empty list when
  // there's no authenticated user. This prevents exposing other users' tasks.
  if (!context.user) {
    return [];
  }

  return context.entities.Task.findMany({
    where: { userId: context.user.id },
    orderBy: [{ createdAt: 'desc' }]
  });
}
