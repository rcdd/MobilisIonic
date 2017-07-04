import { Component } from '@angular/core';
import { HomePage } from '../home/home';
import { TimeTables } from '../timetables/timetables';
import { Favorites } from '../favorites/favorites';
import { TranslateService } from '@ngx-translate/core';

@Component({
  templateUrl: 'tabs.html'
})

export class TabsPage {
  tab1Root: any = HomePage;
  tab2Root: any = TimeTables;
  tab3Root: any = Favorites;

  constructor(translate: TranslateService) {
    translate.setDefaultLang('en');
  }
}