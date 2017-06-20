import { NgModule, ErrorHandler } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
//import { AboutPage } from '../pages/about/about';
import { TimeTables } from '../pages/timetables/timetables';
import { HomePage } from '../pages/home/home';
import { Favorites } from '../pages/favorites/favorites'
import { TabsPage } from '../pages/tabs/tabs';
import { DatabaseProvider } from '../providers/database-provider';
import { NavController } from 'ionic-angular';
import { DataProvider } from '../providers/data-provider';
import { Geolocation } from '@ionic-native/geolocation';
import { Network } from '@ionic-native/network';

@NgModule({
  declarations: [
    MyApp,
    TimeTables,
    HomePage,
    TabsPage,
    Favorites
  ],
  imports: [
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    TimeTables,
    HomePage,
    TabsPage,
    Favorites,
  ],
  providers:
  [{ provide: ErrorHandler, useClass: IonicErrorHandler },
  [SplashScreen, DatabaseProvider, NavController, DataProvider, Geolocation, Network]]
})
export class AppModule {}
