import { NgModule, ErrorHandler } from '@angular/core';
import { SplashScreen } from '@ionic-native/splash-screen';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';
import { TimeTables } from '../pages/timetables/timetables';
import { HomePage } from '../pages/home/home';
import { Favorites } from '../pages/favorites/favorites'
import { TabsPage } from '../pages/tabs/tabs';
import { DatabaseProvider } from '../providers/database-provider';
import { NavController } from 'ionic-angular';
import { DataProvider } from '../providers/data-provider';
import { Geolocation } from '@ionic-native/geolocation';
import { Network } from '@ionic-native/network';
import { Keyboard } from "@ionic-native/keyboard";
import { HttpModule, Http } from '@angular/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';


export function createTranslateLoader(http: Http) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    MyApp,
    TimeTables,
    HomePage,
    TabsPage,
    Favorites
  ],
  imports: [
    IonicModule.forRoot(MyApp), HttpModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (createTranslateLoader),
        deps: [Http]
      }
    })
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
  [SplashScreen, DatabaseProvider, NavController, DataProvider, Geolocation, Network, Keyboard]]
})
export class AppModule { }
