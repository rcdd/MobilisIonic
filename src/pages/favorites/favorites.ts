import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import { DataProvider } from '../../providers/data-provider';
import 'rxjs/add/operator/map';

@Component({
    selector: 'page-favorites',
    templateUrl: 'favorites.html'
})

@Injectable()
export class Favorites {
    private favorites: any;

    constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController, public dataProvider: DataProvider) {
        this.dataProvider.getFavoritesFromDb().then(res => {
            console.dir(res);
           /* res.rows.forEach(element => {
                console.log(element);
            });*/
        });
    }


}
