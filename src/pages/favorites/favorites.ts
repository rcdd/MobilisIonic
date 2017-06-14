import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import { DataProvider } from '../../providers/data-provider';
import 'rxjs/add/operator/map';
import { HomePage } from '../home/home'
import { TabsPage } from '../tabs/tabs'

@Component({
    selector: 'page-favorites',
    templateUrl: 'favorites.html'
})

@Injectable()
export class Favorites {
    private favorites: any = [];
    private home:any;
    constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController, public dataProvider: DataProvider, ) {
        this.home = HomePage;
        this.dataProvider.getFavoritesFromDb().then(res => {
            //console.dir(res);
            this.favorites = res;
        });
    }

    initFavorites() {
        for (var i = 0; i < Object.keys(this.favorites).length; i++) {
            console.log(this.favorites[i].description);
        }
    }

    travelTo(fav: any) {
        console.dir(fav);
        //this.navCtrl.push(HomePage, {description: fav.description, destination: fav.destination, origin: fav.origin});
        //this.navCtrl.push(HomePage);
        //this.navCtrl.setRoot(this.home);
       // this.navCtrl.popToRoot();
       this.navCtrl.parent.select(0);
       
    }
}
