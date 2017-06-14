import { Component, Injectable } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { DataProvider } from '../../providers/data-provider';
import { AlertController, Platform } from 'ionic-angular';
import 'moment';

declare var moment: any;

@Component({
  selector: 'page-timetables',
  templateUrl: 'timetables.html',
})

@Injectable()
export class TimeTables {

  private stops: any[];
  public selectedBusLine: any = [];
  public timesToShow: any = [];
  public timesToShowInList: any = [];
  public possibleTimes: any = [];
  public passedTimes: any = [];
  public stopsToShow: any = [];
  public isVisible: boolean = false;
  public isVisibleSearchbar: boolean = false;
  public isVisibleCkeckBox: boolean = true;
  public stopNameSelected: any;
  public minDate: Date = new Date();
  public maxDate: Date = new Date();
  public selectedDate: any = new Date().toISOString();
  public setFirst: any;
  //@ViewChild(Content)
  //content: Content;
  // @ViewChild('listTimesAutoScroll')
  listTimesAutoScroll: any;

  constructor(public navCtrl: NavController, public http: Http, public toastCtrl: ToastController,
    public dataProvider: DataProvider, public alertCtrl: AlertController, public platform: Platform) {
    this.isVisibleSearchbar = false;
    this.maxDate.setDate(this.minDate.getDate() + 8);

    this.platform.registerBackButtonAction(() => {
      if (this.isVisible) {
        this.hideTimes();
      }
    });
    this.platform.ready().then(() => {
      this.listTimesAutoScroll = document.getElementById("listTimesAutoScroll");
      console.log(this.listTimesAutoScroll);
    });
  }

  updateSelectedValue() {
    this.isVisibleSearchbar = true;
    //console.dir(this.selectedBusLine);
    this.timesToShowInList = [];
    this.timesToShow = [];
    this.dataProvider.getCheckBoxRoutes().forEach(line => {
      if (line.id.id == this.selectedBusLine) {
        // this.stopsToShow = line.id.stops;
        // this.stops = line.id.stops;
        this.removeDuplicates(line.id.stops)
      }
    });
  }

  showTimes(stop: any) {
    //console.log("ShowTime:Stop", stop);
    if (this.dataProvider.getNetworkState()) {
      this.stopNameSelected = stop.name;
      this.isVisibleCkeckBox = false;
      this.isVisibleSearchbar = false;
      this.timesToShowInList = [];
      this.timesToShow = [];
      let listOfLines = [];
      //console.log(this.dataProvider.getNetworkState());

      this.dataProvider.getTimeFromStop(stop.id, this.selectedDate).then(resp => {


        resp.forEach(pat => {
          //console.dir(pat);
          let storeTimes: any = [];

          if (listOfLines.indexOf(pat.pattern.desc) == -1) {
            //console.log("listOfLines", listOfLines);
            listOfLines.push(pat.pattern.desc);
            storeTimes.line = pat.pattern;
            storeTimes.color = pat.pattern.color;
            let first = true;
            let listTimes: any[] = [];

            if (pat.times.length != 0) {
              pat.times.forEach(time => {
                listTimes.push(time);
                storeTimes.times = listTimes;
                if (this.timesToShow.indexOf(storeTimes) == -1)
                  this.timesToShow.push(storeTimes);
              });
              this.timesToShow.sort(this.compare);
              this.timesToShow.forEach((time, index) => {
                if (time.line.id.split(':')[0] + time.line.id.split(':')[1] == this.selectedBusLine.split(':')[0] + this.selectedBusLine.split(':')[1]) {
                  if (first) {
                    this.setFirst = index;
                    this.selectedLine(time.times);
                    first = false;
                  }
                }
              });
            }
          }
        });
        this.isVisible = true;
        // console.dir(this.timesToShow);
      });
    } else {
      this.showToast("NO NETWORK CONNECTION!");
    }
  }

  selectedLine(time) {

    this.timesToShowInList = [];
    this.passedTimes = [];
    this.possibleTimes = [];
    time.forEach(timeToShow => {
      if (this.timesToShowInList.indexOf((timeToShow.realtimeArrival + timeToShow.serviceDay) * 1000) == -1) {
        this.timesToShowInList.push((timeToShow.realtimeArrival + timeToShow.serviceDay) * 1000);
      }
    });

    this.timesToShowInList.forEach((time, key, index) => {
      //console.log((moment(new Date(), "dd-MM-yyyy hh:mm").diff(time, 'minutes')));
      if ((moment(new Date(), "dd-MM-yyyy hh:mm").diff(time, 'minutes')) < 0) {
        this.possibleTimes.push(time);
      } else {
        if (this.passedTimes.indexOf(time) == -1) {
          this.passedTimes.push(time)
        }
      }
    });

    this.passedTimes.sort(function (b, a) {
      a = new Date(a);
      b = new Date(b);
      return a > b ? -1 : a < b ? 1 : 0;
    });

    this.possibleTimes.sort(function (b, a) {
      a = new Date(a);
      b = new Date(b);
      return a > b ? -1 : a < b ? 1 : 0;
    });
    //this.scrollToTop();
    //this.scrollElement();
    //console.log(this.possibleTimes)
  }

  /*scrollToTop() {
    setTimeout(function () {
      var itemList = document.getElementById("listTimesAutoScroll");
      itemList.scrollTop = itemList.scrollHeight;
    }, 10);
  }
  scrollElement() {
    //this.content.scrollTo(0, this.listTimesAutoScroll.offsetTop, 500);
    console.log(this.content.getContentDimensions());
    this.content.scrollToBottom();
    if (this.listTimesAutoScroll != undefined) {
      let yOffset =  this.listTimesAutoScroll.offsetTop;
      this.listTimesAutoScroll.nativeElement.scrollTo(0, yOffset, 4000);
    }

  }*/

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
      .replace(/ã/g, 'a')
      .replace(/â/g, 'a');
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

  compare(a, b) {
    if (a.line.desc < b.line.desc)
      return -1;
    if (a.line.desc > b.line.desc)
      return 1;
    return 0;
  }

}
