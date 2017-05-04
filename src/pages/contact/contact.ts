import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http, Response } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../../providers/data-provider';
import { AlertController } from 'ionic-angular';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})

@Injectable()
export class ContactPage {

  private stops: any[];
  public selectedBusLine: any = [];
  public busLinesToPresent: any;
  public timesToShow: any = [];
  public timesToShowInList: any = [];

  constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController,
    public dataProvider: DataProvider,
    public alertCtrl: AlertController) {

    this.busLinesToPresent = dataProvider.CheckBoxRoutes;
  }

  updateSelectedValue() {
    //console.dir(this.selectedBusLine);
    this.timesToShowInList = [];
    this.timesToShow = [];
    this.dataProvider.CheckBoxRoutes.forEach(line => {
      if (line.id.id == this.selectedBusLine) {
        this.stops = line.id.stops;
        //console.log(this.stops);
      }
    });
  }

  showTimes(stop: any) {
    this.dataProvider.getTimeFromStop(stop.id).then(a => {
      this.timesToShow = [];
      let resp = a;
      //console.dir(resp);
      let msg = " Lines:";
      let storeTimes: any;

      resp.forEach(pat => {
        storeTimes = [];
        storeTimes.line = pat.pattern;
        let listTimes: any[] = [];
        pat.times.forEach(time => {
          listTimes.push(time);
        });
        storeTimes.times = listTimes;
        this.timesToShow.push(storeTimes);
      });
      //console.dir(this.timesToShow);
      msg += "<br>TIME-STOP</br>";
      //this.showAlert(stop.name, msg);
    });
  }

  selectedLine(time) {
    this.timesToShowInList = [];
    time.forEach(timeToShow => {
      if (this.timesToShowInList.indexOf((timeToShow.realtimeArrival + timeToShow.serviceDay) * 1000) == -1) {
        this.timesToShowInList.push((timeToShow.realtimeArrival + timeToShow.serviceDay) * 1000);
      }
    });

    // console.dir(this.timesToShowInList);
    this.timesToShowInList.sort(function (a, b) {
      a = new Date(a);
      b = new Date(b);
      return a > b ? -1 : a < b ? 1 : 0;
    });
  }

  showAlert(title: any, msg: any) {
    let alert = this.alertCtrl.create({
      title: title,
      subTitle: msg,
      buttons: ['OK']
    });
    alert.present();
  }
}
