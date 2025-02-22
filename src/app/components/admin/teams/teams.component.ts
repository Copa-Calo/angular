import { Component } from '@angular/core'
import { FormBuilder, Validators } from '@angular/forms'

import { LoadingService } from '$$/loading.service'
import { MessagesService } from '$$/messages.service'
import { TeamsService } from '$$/teams.service'

import { AngularFireStorage } from '@angular/fire/storage'
import 'firebase/storage'


@Component({
    selector: 'app-admin-teams',
    templateUrl: './teams.component.html',
    styleUrls: ['../admin.component.scss']
})
export class AdminTeamsComponent {
    readonly form = this.fb.group({
        name: [null, Validators.required],
        init: [null]
    })
    logo: File

    constructor(
        private fb: FormBuilder,
        private ldn: LoadingService,
        private msgs: MessagesService,
        private tms: TeamsService,
        private storage: AngularFireStorage
    ) { }

    private async createWith(name: string, initials: string) {
        const photo = await this.storage.ref(`/teams/${initials}`).put(this.logo)
        await this.tms.teamRef(initials).set({ name, initials, logoUrl: photo.downloadURL! })
    }

    async create() {
        try {
            const {name, init} = this.form.value
            await this.ldn.runOn(this.createWith(name, init))
            this.msgs.hint(`Equipe ${name} criada`)
        } catch (err) {
            await this.delete(false)
            this.emitError(err)
        }
    }

    async delete(show = true) {
        const {name, init} = this.form.value
        try {
            const task =this.storage.ref(`/teams/${init}`).delete()
            const del = this.tms.teamRef(init).delete()
            await this.ldn.runOn(Promise.all([task, del]))

            if (show) {
                this.msgs.hint(`Equipe ${name} deletada`)
            }
        } catch (err) {
            if (show) {
                this.emitError(err)
            }
        }
    }

    emitError(err: any) {
        this.msgs.error(`${err.message ?? err}`, err)
    }
}
