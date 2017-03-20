import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})

@Injectable()
export class ContactPage {

  private stops: any
  private stopsNames: string[]

  constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController) {

  }

  ngOnInit(): void {
    this.stopsNames = [];
    this.getBusLines();
  }

  getBusLines() {
    return this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`)
      .map((res: Response) => res.json()).subscribe(a => {
        this.stops = a;
        console.log(this.stops);
        this.resetNamesStops();
      });

  }

  resetNamesStops() {
    this.stopsNames = [];
    this.stops.forEach(stop => {
      this.stopsNames.push(stop.longName);
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
    var stopSearch: any;
    this.stops.forEach(stop => {
      if (stop.longName == nameStop) {
        stopSearch = stop;
      }
    });

    let toast;
    if (stopSearch == undefined) {
      toast = this.toastCtrl.create({
        message: 'Error',
        duration: 2000,
      });
    } else {
      toast = this.toastCtrl.create({
        message: 'Id: ' + stopSearch.id +'Mode: ' + stopSearch.mode + ' Short Name: ' + stopSearch.shortName,
        duration: 2000,
      });
    }

    toast.present(toast);
  }

}
