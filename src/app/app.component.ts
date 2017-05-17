import { Component } from '@angular/core';
import { Platform, AlertController } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { NavController } from 'ionic-angular';
import { TabsPage } from '../pages/tabs/tabs';
import { DatabaseProvider } from '../providers/database-provider';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../providers/data-provider';
import { Network } from '@ionic-native/network';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = TabsPage;
  public hasNetwork: boolean = true;

  constructor(platform: Platform,
    public db: DatabaseProvider,
    public http: Http,
    private navController: NavController,
    public dataProvider: DataProvider,
    private network: Network,
    private alertCtrl: AlertController) {


    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      setTimeout(() => {
        Splashscreen.hide();
      }, 100);

      network.onDisconnect().subscribe(() => {
        this.hasNetwork = false;
        let alert = this.alertCtrl.create({
          title: "Internet Connection",
          subTitle: "Please Check Your Network connection",
          buttons: [{
            text: 'Ok',
            handler: () => {
              //this.platform.exitApp();
            }
          }]
        });
        alert.present();
      });

      network.onConnect().subscribe(() => {
        this.hasNetwork = true;
        console.log('you are online');
      });

      /*if (navigator.onLine) {
        console.log("NETwork On");
      } else {
        console.log("NETwork Off");

      }
      console.log("Network state:", this.network.type);*/

      /*platform.registerBackButtonAction(() => {
        let nav = this.navController.getActiveChildNav();
        if (nav.canGoBack()) { //Can we go back?
          nav.pop();
        } else {
          let confirm = this.alertCtrl.create({
            title: '¿Deseas salir de +++++++++ App?',
            message: 'El contenido que no tengas guardado, se eliminará',
            buttons: [
              {
                text: 'Salir',
                handler: () => {
                  platform.exitApp();
                }
              },
              {
                text: 'Cancelar',
                handler: () => {
                  //
                }
              }
            ]
          });
          confirm.present();
        }
      });*/
    });
  }
}
