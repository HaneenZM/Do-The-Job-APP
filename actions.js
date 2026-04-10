import { HttpError } from 'wasp/server'

export const createTask = async (arg, context) => {
  const { description: rawDescription, priority: rawPriority } = arg || {}

  if (!context.user) { throw new HttpError(401) }

  const description = rawDescription ? String(rawDescription).trim() : ''
  if (!description) { throw new HttpError(400, 'Description must not be empty') }

  const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH']
  let priority = 'MEDIUM'
  if (rawPriority !== undefined && rawPriority !== null) {
    const p = String(rawPriority).toUpperCase()
    if (!allowedPriorities.includes(p)) {
      throw new HttpError(400, 'Invalid priority. Allowed values: LOW, MEDIUM, HIGH')
    }
    priority = p
  }

  const createdTask = await context.entities.Task.create({
    data: {
      description,
      priority,
      status: 'IN_PROGRESS',
      user: { connect: { id: context.user.id } }
    }
  })

  return createdTask
}

export const updateTask = async (arg, context) => {
  const { id, description, priority, status } = arg || {}

  if (!context.user) { throw new HttpError(401) }

  if (!id) { throw new HttpError(400, 'Task id is required') }

  const task = await context.entities.Task.findUnique({ where: { id } })
  if (!task) { throw new HttpError(404) }
  if (task.userId !== context.user.id) { throw new HttpError(403) }

  const data = {}
  if (typeof description !== 'undefined') data.description = description
  if (typeof priority !== 'undefined') data.priority = priority
  if (typeof status !== 'undefined') data.status = status

  if (Object.keys(data).length === 0) {
    return task
  }

  const updatedTask = await context.entities.Task.update({
    where: { id },
    data
  })

  return updatedTask
}

export const toggleTaskStatus = async (arg, context) => {
  const { id } = arg || {}

  if (!context.user) { throw new HttpError(401) }
  if (!id) { throw new HttpError(400, 'Task id is required') }

  const task = await context.entities.Task.findUnique({ where: { id } })
  if (!task) { throw new HttpError(404) }
  if (task.userId !== context.user.id) { throw new HttpError(403) }

  let newStatus
  if (task.status === 'IN_PROGRESS') {
    newStatus = 'DONE'
  } else if (task.status === 'DONE') {
    newStatus = 'IN_PROGRESS'
  } else if (task.status === 'NEEDS_ATTENTION') {
    newStatus = 'IN_PROGRESS'
  } else {
    newStatus = 'IN_PROGRESS'
  }

  const updatedTask = await context.entities.Task.update({
    where: { id },
    data: { status: newStatus }
  })

  return updatedTask
}

export const deleteTask = async (arg, context) => {
  const { id } = arg || {}

  if (!context.user) { throw new HttpError(401) }
  if (!id) { throw new HttpError(400, 'Task id is required') }

  const task = await context.entities.Task.findUnique({ where: { id } })
  if (!task) { throw new HttpError(404) }
  if (task.userId !== context.user.id) { throw new HttpError(403) }

  const deletedTask = await context.entities.Task.delete({ where: { id } })

  return deletedTask
}

export const clearUserTasks = async (arg, context) => {
  if (!context.user) { throw new HttpError(401) }

  const result = await context.entities.Task.deleteMany({
    where: { userId: context.user.id }
  })

  return result.count
}
