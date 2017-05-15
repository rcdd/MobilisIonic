import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../../providers/data-provider';
import { AlertController } from 'ionic-angular';

@Component({
  selector: 'page-timetables',
  templateUrl: 'timetables.html'
})

@Injectable()
export class TimeTables {

  private stops: any[];
  public selectedBusLine: any = [];
  public busLinesToPresent: any;
  public timesToShow: any = [];
  public timesToShowInList: any = [];
  public stopsToShow: any = [];
  public isVisible: boolean = false;
  public isVisibleSearchbar: boolean = false;
  public isVisibleCkeckBox : boolean = true;
  public stopNameSelected : any;
  public minDate : Date = new Date();
  public maxDate : Date =  new Date();
  public selectedDate : any = new Date().toISOString();

  constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController,public dataProvider: DataProvider,public alertCtrl: AlertController) {
    this.busLinesToPresent = dataProvider.CheckBoxRoutes;
    this.isVisibleSearchbar = false;
    this.maxDate.setDate(this.minDate.getDate() + 5);
  }

  updateSelectedValue() {
    this.isVisibleSearchbar = true;
    //console.dir(this.selectedBusLine);
    this.timesToShowInList = [];
    this.timesToShow = [];
    this.dataProvider.CheckBoxRoutes.forEach(line => {
      if (line.id.id == this.selectedBusLine) {
        // this.stopsToShow = line.id.stops;
        // this.stops = line.id.stops;
        this.removeDuplicates(line.id.stops)
      }
    });
  }

  showTimes(stop: any) {
    this.stopNameSelected = stop.name;
    this.isVisibleCkeckBox = false;
    this.isVisibleSearchbar = false;
    this.timesToShowInList = [];
    this.timesToShow = [];

    this.dataProvider.getTimeFromStop(stop.id, this.selectedDate).then(a => {
    let resp = a;
      resp.forEach(pat => {
        let storeTimes: any = [];
        storeTimes.line = pat.pattern;

        let listTimes: any[] = [];
        if (pat.times.length != 0) {
          pat.times.forEach(time => {
            listTimes.push(time);
            storeTimes.times = listTimes;
            if(this.timesToShow.indexOf(storeTimes) == -1)
            this.timesToShow.push(storeTimes);
          });
        }
      });
      this.isVisible = true;
      console.dir(this.timesToShow);
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
    this.timesToShowInList.sort(function (b, a) {
      a = new Date(a);
      b = new Date(b);
      return a > b ? -1 : a < b ? 1 : 0;
    });
    //console.dir(this.timesToShowInList);
  }

  showAlert(title: any, msg: any) {
    let alert = this.alertCtrl.create({
      title: title,
      subTitle: msg,
      buttons: ['OK']
    });
    alert.present();
  }

  getItems(ev) {
    this.isVisible = false;
    // Reset items back to all of the items
    this.resetNamesStops();

    // set val to the value of the ev target
    var val = ev.target.value;

    // if the value is an empty string don't filter the items
    //console.dir(this.stopsToShow);
    if (val && val.trim() != '') {
      //console.dir(this.stopsToShow);
      this.stopsToShow = this.stopsToShow.filter((item) => {
        let stopsAccents = this.removeAccents(item.name).toLowerCase().indexOf(val.toLowerCase()) > -1;
        let stopsNoAccents = item.name.toLowerCase().indexOf(val.toLowerCase()) > -1;
        if (stopsAccents) {
          return stopsAccents;
        } else {
          return stopsNoAccents;
        }
      })
    }
  }

  resetNamesStops() {
    this.stopsToShow = [];
    this.stops.forEach(stop => {
      this.stopsToShow.push(stop);
    });
  }

  removeAccents(value) {
    return value
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/ã/g, 'a');
  }

  removeDuplicates(myArr) {
    let arrTest = [];
    this.stops = [];
    this.stopsToShow = [];
    myArr.forEach(element => {
      if (arrTest.indexOf(element.name) == -1) {
        arrTest.push(element.name);
        this.stops.push(element);
        this.stopsToShow.push(element);
      }
    });
  }

  hideTimes() {
    this.resetNamesStops();
    this.isVisible = false;
    this.isVisibleSearchbar = true;
    this.isVisibleCkeckBox = true;
  }

  showToast(msg: string) {
    let toast = this.toastCtrl.create({
      message: msg,
      duration: 3000,
    });

    toast.present(toast);
  }

}