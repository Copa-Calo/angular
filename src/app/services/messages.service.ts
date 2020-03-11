import { Injectable, EventEmitter } from '@angular/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { environment } from '##/environments/environment'

import { merge } from 'rxjs'
import { map } from 'rxjs/operators'


export type MessageString = string | String
export interface MessageData {
    message: MessageString
    duration?: number
}
export type Message = MessageData | MessageString


@Injectable({
    providedIn: 'root'
})
export class MessagesService {

    readonly error = new EventEmitter<Message>()
    readonly hint = new EventEmitter<Message>()

    readonly opener = this.eventSubscription()

    constructor(private _snackBar: MatSnackBar) { }

    eventSubscription() {
        const error = this.error.pipe(defaultTo(5000, 'error'))
        const hint = this.hint.pipe(defaultTo(2500, 'hint'))

        return merge(error, hint).subscribe({
            next: data => {
                if (!environment.production) {
                    console.log(data)
                }
                this._snackBar.open(data.message, 'Fechar', {
                    data: data.message,
                    duration: data.duration,
                    panelClass: [
                        `message-${data.type}`,
                    ]
                })
            }
        })
    }
}


function defaultTo(duration: number, type: string) {
    return map((message: Message) => {
        if (typeof message === 'string' || message instanceof String) {
            return {
                message: `${message}`,
                duration,
                type
            }
        } else {
            return {
                message: `${message.message}`,
                duration: message.duration ?? duration,
                type
            }
        }
    })
}
