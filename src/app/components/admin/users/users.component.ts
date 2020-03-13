import { Component, OnInit, OnDestroy } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms'

import { Observable, Subscription } from 'rxjs'
import {
    map, tap, delay, startWith, exhaustMap,
    retryWhen, take, shareReplay
} from 'rxjs/operators'

import { MessagesService } from '$$/messages.service'
import { FunctionsService, User } from '$$/functions.service'
import { LoadingService } from '$$/loading.service'


interface Query {
    email?: string,
    users: User[]
}


@Component({
    selector: 'app-admin-users',
    templateUrl: './users.component.html',
    styleUrls: ['../admin.component.scss']
})
export class AdminUsersComponent implements OnInit, OnDestroy {

    private _users$: Observable<User[]>
    private _autoTeamDisable: Subscription

    filteredEmails$: Observable<string[]>
    form: FormGroup

    constructor(
        private _fb: FormBuilder,
        private _msgs: MessagesService,
        private _fns: FunctionsService,
        private _ldn: LoadingService
    ) {}

    ngOnInit() {
        this.form = this._fb.group({
            email: [null],
            password: [{value: null, disabled: true}],
            role:[null],
            team: [{value: null, disabled: true}]
        })

        this._users$ = this._fns.listAllUsers().pipe(
            retryWhen(errors => errors.pipe(delay(1000), take(2))),
            shareReplay(1)
        )

        this._buildFilteredEmails()
        this._buildAutoTeamDisable()
    }

    private _buildFilteredEmails() {
        const emailFormVal = this.form.get('email')!.valueChanges as Observable<string>
        this.filteredEmails$ = emailFormVal.pipe(
            startWith(''),
            exhaustMap(email => this._users$.pipe(
                map(this._filterUsers(email))
            )),
            tap(query => {
                if (query.users.length === 1 &&
                    query.users[0].email.toLowerCase() === query.email) {

                    this._setRole(query.users[0])
                }
            }),
            map(query => query.users.map(user => user.email))
        )
    }

    private _buildAutoTeamDisable() {
        const roleFormVal = this.form.get('role')!.valueChanges
        const teamFormCtrl = this.form.get('team')!

        this._autoTeamDisable = roleFormVal.pipe(
            map(role => {
                if (role === 'dm') {
                    teamFormCtrl.enable({emitEvent: false})
                } else {
                    teamFormCtrl.disable({emitEvent: false})
                }
            })
        ).subscribe()
    }

    ngOnDestroy() {
        this._autoTeamDisable.unsubscribe()
    }

    private _filterUsers(email?: string): (users: User[]) => Query {
        return users => {
            if (email) {
                const lower = email.toLowerCase()
                return {
                    email: lower,
                    users: users.filter(user => user.email.toLowerCase().startsWith(lower))
                }
            } else {
                return { email, users }
            }
        }
    }

    private _setRole({role, team}: {role?: string, team?: string}) {
        if (role) {
            this.form.get('role')!.setValue(role)
        }
        if (team) {
            this.form.get('team')!.setValue(team)
        }
    }

    async genPasswd(): Promise<void> {
        try {
            const passwd = await this._fns.generatePassword().toPromise()
            this.form.get('password')!.setValue(passwd)
        } catch (err) {
            this.emitError(err)
        }
    }

    togglePasswd() {
        const ctrl = this.form.get('password')!
        if (ctrl.disabled) {
            ctrl.enable()
        } else {
            ctrl.disable()
        }
    }

    async submit() {
        try {
			const {email, password, role, team} = this.form.value
            const ans = this._fns.updateUser(email, password, {role, team})
            await this._ldn.runOn(ans.toPromise())
            this._msgs.hint('Usuário atualizado ou criado')
        } catch (err) {
            this.emitError(err)
        }
    }

    emitError(err: any) {
        if (err.message) {
            this._msgs.error(`${err.message}`, err)
        } else {
            this._msgs.error(`${err}`, err)
        }
    }
}
