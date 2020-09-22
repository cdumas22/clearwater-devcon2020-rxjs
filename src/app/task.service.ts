import { Injectable } from '@angular/core'
import { EMPTY } from 'rxjs'
import { Task } from './models/task'
import { User } from './models/user'

const url = '/api/tasks'

function mergeUser(users: User[]) {
  return (task: Task): Task =>
    task.user == null
      ? {
          ...task,
          user: users.find(user => user.id === task.userId),
        }
      : task
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  tasks = EMPTY
}
