import { Component, Injectable } from '@angular/core';
import { NavController, ToastController, AlertController } from 'ionic-angular';
import { Http } from '@angular/http';
import { DataProvider } from '../../providers/data-provider';
import 'rxjs/add/operator/map';

import { TranslateService } from '@ngx-translate/core';
@Component({
    selector: 'page-favorites',
    templateUrl: 'favorites.html'
})

@Injectable()
export class Favorites {
    private favoritesRoutes: any = [];
    private favoritesPlaces: any = [];
    private favoritesToShow: any = [];
    private currentSearch: any = "";

    constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController,
        public alertCtrl: AlertController, public dataProvider: DataProvider, public translate: TranslateService) {
    }

    ionViewWillEnter() {
        this.dataProvider.loading = true;
        this.favoritesToShow = [];
        this.dataProvider.getFavoritesRoutesFromDb().then(res => {
            if (res != null) {
                this.favoritesRoutes = res;
                this.favoritesToShow.routes = this.favoritesRoutes;
            }
        }).then(() => {
            this.dataProvider.getFavoritesPlacesFromDb().then(res => {
                if (res != null) {
                    this.favoritesPlaces = res;
                    this.favoritesToShow.places = this.favoritesPlaces;
                }
                this.dataProvider.loading = false;
            })
        });
    }

    travelToRoute(fav: any) {
        console.dir(fav);
        this.dataProvider.setFavoriteRoute(fav);
        this.navCtrl.parent.select(0);
    }

    travelToPlace(fav: any) {
        console.dir(fav);
        this.dataProvider.setFavoritePlace(fav);
        this.navCtrl.parent.select(0);
    }

    deleteFav(fav: any, route: boolean = true) {
        let alert = this.alertCtrl.create({
            title: this.translate.instant("FAVORITES.FAVORITE_DELETE_ALERT.TITLE"),
            subTitle: this.translate.instant("FAVORITES.FAVORITE_DELETE_ALERT.DELETE_FAVORITE_MESSAGE") + fav.description + "?",
            buttons: [{
                text: this.translate.instant("FAVORITES.FAVORITE_DELETE_ALERT.BUTTON_YES"),
                role: 'ok',
                handler: data => {
                    if (route) {
                        this.dataProvider.deleteFavoriteRoute(fav);
                        let index: number = this.favoritesToShow.routes.indexOf(fav);
                        if (index !== -1) {
                            this.favoritesToShow.routes.splice(index, 1);
                        }
                    } else {
                        this.dataProvider.deleteFavoritePlace(fav);
                        let index: number = this.favoritesToShow.places.indexOf(fav);
                        if (index !== -1) {
                            this.favoritesToShow.places.splice(index, 1);
                        }
                    }
                    this.showToast(this.translate.instant("FAVORITES.FAVORITE_DELETE_ALERT.DELETED_MESSAGE"), 3000);
                    alert.dismiss();

                }
            }, {
                text: this.translate.instant("FAVORITES.FAVORITE_DELETE_ALERT.BUTTON_NO"),
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
        toast.present();
    }

    getItems(ev) {
        // set val to the value of the ev target
        var val = ev.target.value;
        console.log(val);
        this.currentSearch = val;

        this.resetNamesFavorites();

        if (val && val.trim() != '') {
            this.favoritesToShow.routes = this.favoritesRoutes.filter((item) => {
                return this.removeAccents(item.description).toLowerCase().indexOf(this.removeAccents(val).toLowerCase()) > -1;
            });
            this.favoritesToShow.places = this.favoritesPlaces.filter((item) => {
                return this.removeAccents(item.description).toLowerCase().indexOf(this.removeAccents(val).toLowerCase()) > -1;
            });
        }
    }

    resetNamesFavorites() {
        this.favoritesToShow.routes = [];
        this.favoritesToShow.routes = this.favoritesRoutes;
        this.favoritesToShow.places = [];
        this.favoritesToShow.places = this.favoritesPlaces;

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
