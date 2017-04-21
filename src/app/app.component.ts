import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { NavController } from 'ionic-angular';
import { TabsPage } from '../pages/tabs/tabs';
import { DatabaseProvider } from '../providers/database-provider';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../providers/data-provider';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = TabsPage;

  constructor(platform: Platform,
    public db: DatabaseProvider,
    public http: Http,
    private navController: NavController,
    private DataProvider: DataProvider) {

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();
      //this.ngOnStart();
    });
  }

  ngOnInit(): void {
    // Só para testar se mesmo que não tenha tabelas tempo e consegue criar ao iniciar a aplicação
    //this.DataProvider.getDataFromServer();
    //console.dir(this.DataProvider.loadStops());
  }


}
