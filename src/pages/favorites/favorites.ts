import { Component, Injectable } from '@angular/core';
import { NavController, ToastController, AlertController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import { DataProvider } from '../../providers/data-provider';
import 'rxjs/add/operator/map';

@Component({
    selector: 'page-favorites',
    templateUrl: 'favorites.html'
})

@Injectable()
export class Favorites {
    private favorites: any = [];
    private favoritesToShow: any = [];
    private home: any;
    constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController, public alertCtrl: AlertController, public dataProvider: DataProvider, ) {

        this.dataProvider.getFavoritesFromDb().then(res => {
            this.favorites = res;
            this.favoritesToShow = this.favorites;
        });
    }
    
    async ionViewWillEnter() {
      this.dataProvider.loading = true;
      await this.dataProvider.getFavoritesFromDb().then(res => {
            console.dir(res);
            return this.favorites = res;
        });
        this.dataProvider.loading = false;
    }

    travelTo(fav: any) {
        console.dir(fav);
        this.dataProvider.setFavorite(fav);
        this.navCtrl.parent.select(0);
    }

    deleteFav(fav: any) {
        let alert = this.alertCtrl.create({
            title: "Delete Favorite",
            subTitle: "Are you sure you want to delete " + fav.description + "?",
            buttons: [{
                text: 'Yes',
                role: 'ok',
                handler: data => {
                    this.dataProvider.deleteFavorite(fav);
                    this.showToast("Your favorite was deleted", 3000);
                    alert.dismiss();
                }
            }, {
                text: 'Cancel',
                role: 'cancel',
                handler: data => {
                    alert.dismiss();
                }
            }]
        });
        alert.present();

    }

    showToast(msg: string, ms: number): void {
        let toast = this.toastCtrl.create({
            message: msg,
            duration: ms,
            position: 'top',
            showCloseButton: true
        });
        toast.onDidDismiss(() => {
            console.log('Dismissed toast');
        });

        toast.present();
    }

    getItems(ev) {
        // set val to the value of the ev target
        var val = ev.target.value;
        console.log(val);

        this.resetNamesFavorites();

        if (val && val.trim() != '') {
            this.favoritesToShow = this.favorites.filter((item) => {
                let favAccents = this.removeAccents(item.description).toLowerCase().indexOf(val.toLowerCase()) > -1;
                let favNoAccents = item.description.toLowerCase().indexOf(val.toLowerCase()) > -1;
                if (favAccents) {
                    return favAccents;
                } else {
                    return favNoAccents;
                }
            })
        }
    }

    resetNamesFavorites() {
        this.favoritesToShow = [];
        for (var i = 0; i < Object.keys(this.favorites).length; i++) {
            this.favoritesToShow.push(this.favorites[i]);
        }
    }

    removeAccents(value) {
        return value
            .replace(/á/g, 'a')
            .replace(/é/g, 'e')
            .replace(/í/g, 'i')
            .replace(/ó/g, 'o')
            .replace(/ú/g, 'u')
            .replace(/ç/g, 'c')
            .replace(/ã/g, 'a')
            .replace(/â/g, 'a');
    }
}
