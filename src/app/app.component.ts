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

      (network.type != "none" ? dataProvider.setNetworkState(true) : dataProvider.setNetworkState(false));

      network.onDisconnect().subscribe(() => {
        dataProvider.setNetworkState(false);
        let alert = this.alertCtrl.create({
          title: "Internet Connection",
          subTitle: "Please Check Your Network connection",
          buttons: [{
            text: 'Ok',
            handler: () => {
            }
          }]
        });
        alert.present();
      });

      network.onConnect().subscribe(() => {
        dataProvider.setNetworkState(true);
        console.log('you are online');
      });
    });
  }
}
