import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})

@Injectable()
export class AboutPage {
  private stops: any
  private stopsNames: string[]

  constructor(public navCtrl: NavController, public http:Http, public toastCtrl: ToastController ) {

  }

  ngOnInit(): void {
    this.stopsNames = [];
    this.getStopsStations();
  }

  getStopsStations() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/stops`)
    .map((res:Response) => res.json()).subscribe(a => {
      this.stops=a;
    //console.log(this.stops);
    this.resetNamesStops();
    });
  }

  resetNamesStops(){
    this.stopsNames = [];
      this.stops.forEach(stop => {
        this.stopsNames.push(stop.name);
      });
  }

  itemSelected(item: string) {
    console.log("Selected Item", item);
  }

  getItems(ev) {
    // Reset items back to all of the items
    this.resetNamesStops();

    // set val to the value of the ev target
    var val = ev.target.value;

    // if the value is an empty string don't filter the items
    if (val && val.trim() != '') {
      this.stopsNames = this.stopsNames.filter((item) => {
        return (item.toLowerCase().indexOf(val.toLowerCase()) > -1);
      })
    }
  }

  showToast(nameStop: string) {
    var stopSearch:any;
    this.stops.forEach(stop => {
      if(stop.name == nameStop){
        stopSearch = stop;
      }
    });

    let toast = this.toastCtrl.create({
      message: 'latitude: '+stopSearch.lat+' longitude: '+stopSearch.lon,
      duration: 2000,
    });

    toast.present(toast);
  }

}


