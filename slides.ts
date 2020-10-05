/* eslint-disable @typescript-eslint/no-unused-vars */
import { addMonths } from 'date-fns'

/*
    Mutated State
    Imperative Programming
*/

// interface Task {
//   title: string
//   dueDate: Date
// }

// const tasks: Task[] = [
//   { title: 'Learn Angular', dueDate: new Date('2020-11-01') },
//   { title: 'Learn RxJS', dueDate: new Date('2020-11-04') },
// ]

// // iterate over tasks and extend the due date
// for (const task of tasks) {
//   task.dueDate = addMonths(task.dueDate, 1)
// }

/* 
    Object oriented  
    Mutated state
    Imperative Programming
*/

// /** Task class to encapsulate functionality */
// class Task {
//   constructor(public title: string, public dueDate: Date) {}

//   extendDueDate(months: number) {
//     this.dueDate = addMonths(this.dueDate, months)
//   }
// }

// /** Create new task list */
// const tasks: Task[] = [
//   new Task('Learn Angular', new Date('2020-11-01')),
//   new Task('Learn RxJS', new Date('2020-11-05')),
// ]

// // Iterate over tasks and call extendDueDate for each one
// for (const task of tasks) {
//   task.extendDueDate(1)
// }

/*
    Declarative Programming
    Immutable
*/

interface Task {
  title: string
  dueDate: Date
}

/** Plain old object list of tasks */
let tasks: Task[] = [
  { title: 'Learn Angular', dueDate: new Date('2020-11-01') },
  { title: 'Learn RxJS', dueDate: new Date('2020-11-04') },
]

// extend the due date of the tasks in an immutable way
tasks = tasks.map(task => ({
  ...task,
  dueDate: addMonths(task.dueDate, 1),
}))

/*
    Declarative Programming
    Immutable
    Functional
*/

// abstract the extending of due date into a function
tasks = extendDueDate(1)(tasks)

function extendDueDate(months: number) {
  // Curry the extendDueDate function to allow passing in tasks
  return (_tasks: Task[]) =>
    _tasks.map(task => ({
      ...task,
      dueDate: addMonths(task.dueDate, months),
    }))
}
