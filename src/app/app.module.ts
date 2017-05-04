import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { AboutPage } from '../pages/about/about';
import { ContactPage } from '../pages/contact/contact';
import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';
import { DatabaseProvider } from '../providers/database-provider';
import { NavController } from 'ionic-angular';
import { DataProvider } from '../providers/data-provider';
import { Geolocation } from '@ionic-native/geolocation';
import { Network } from '@ionic-native/network';

@NgModule({
  declarations: [
    MyApp,
    AboutPage,
    ContactPage,
    HomePage,
    TabsPage
  ],
  imports: [
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    AboutPage,
    ContactPage,
    HomePage,
    TabsPage
  ],
  providers:
  [{ provide: ErrorHandler, useClass: IonicErrorHandler },
  [DatabaseProvider, NavController, DataProvider, Geolocation, Network]]
})
export class AppModule { }
