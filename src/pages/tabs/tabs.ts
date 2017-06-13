import { Component } from '@angular/core';

import { HomePage } from '../home/home';
import { TimeTables } from '../timetables/timetables';
import { Favorites } from '../favorites/favorites';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {
  // this tells the tabs component which Pages
  // should be each tab's root Page
  tab1Root: any = HomePage;
  tab2Root: any = TimeTables;
  tab3Root: any = Favorites;

  constructor() {
  }
}