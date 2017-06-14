import { Injectable } from '@angular/core';
import { Platform, AlertController, ToastController } from 'ionic-angular';
import 'rxjs/Rx';
import { DatabaseProvider } from './database-provider';
import { Http, Headers, RequestOptions } from '@angular/http';

import 'moment';

declare var moment: any;

@Injectable()
export class DataProvider {

    public lines: any = [];
    public stops: any[] = [];
    public innit: number = 0;
    public loading: boolean = false;
    public CheckBoxRoutes: any = [];
    public hasNetwork: boolean = null;
    public favoritesRoutes: any = [];

    public test: any;



    constructor(private http: Http, private db: DatabaseProvider, public toastCtrl: ToastController,
        private alertCtrl: AlertController, private platform: Platform) {
        // watch network for a connection
        this.platform.ready().then(() => {
            this.db.init();
        });
    }

    async getStops() {
        return this.stops;
    }

    async planningRoute(origin: any, destination: any) {
        if (this.hasNetwork) {
            this.loading = true;
            let date = moment().format("YYYYMMDD");
            let time = moment().format("HH:mm");


            //http://194.210.216.191/otp/routers/default/plan?fromPlace=39.73983136620544%2C-8.804597854614258&toPlace=39.74448420653371%2C-8.798589706420898&time=5%3A27pm&date=05-01-2017&mode=TRANSIT%2CWALK&maxWalkDistance=750
            let resp = await this.http.get(`http://194.210.216.191/otp/routers/default/plan?fromPlace=` + origin + `&toPlace=` + destination + `&time=` + time + `&date=` + date + `&mode=TRANSIT%2CWALK&maxWalkDistance=750`).toPromise();
            //console.log("planningRoute", resp.json());
            this.loading = false;
            return resp.json();
        } else {
            return null;
        }
    }

    async getSearchPlace(keyword: string) {
        if (this.hasNetwork) {
            this.loading = true;
            //GET PLACES
            let headers = new Headers({ 'Access-Control-Allow-Origin': 'http://localhost:8100' });
            let options = new RequestOptions({ headers: headers });
            //let key = 'AIzaSyD1i1kgXFRinKusaftvainJ6lqVvIgIfSU';
            let key = 'AIzaSyCIAsIQk7fTx3KomXq0fE6klhA8mP5jKtY';
            let resp = await this.http.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=39.7417679,-8.8090963&radius=5000&keyword=` + keyword + `&key=` + key, options).toPromise();
            console.log("searchPlaces", resp.json());
            if (resp.json().status != "OK" && resp.json().error_message) {
                let toast = this.toastCtrl.create({
                    message: resp.json().error_message,
                    duration: 3000,
                    position: 'top',
                    showCloseButton: true
                });
                toast.onDidDismiss(() => {
                    console.log('Dismissed toast');
                });

                toast.present();
            }
            let res = resp.json().results;
            //console.log("searchAll", res);
            //GET MARKERS
            for (var index = 0; index < Object.keys(this.stops).length; index++) {
                let line = this.stops[Object.keys(this.stops)[index]];
                line.stops.forEach(stop => {
                    if (stop.name.toLowerCase().indexOf(keyword.toLowerCase()) > -1 || this.removeAccents(stop.name).toLowerCase().indexOf(keyword.toLowerCase()) > -1) {
                        let duplicate: boolean = false;
                        res.forEach(place => {
                            if (place.name == stop.name) {
                                duplicate = true;
                            }
                        });
                        if (!duplicate) {
                            res.push({ "id": stop.id, "name": stop.name, "geometry": { "location": { "lat": stop.lat, "lng": stop.lon } } });
                        }
                    }
                });
            }
            this.loading = false;
            return res.reverse();
        } else {
            return null;
        }
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
    async getReverseGeoCoder(lat: any, lng: any) {
        if (this.hasNetwork) {
            this.loading = true;
            let resp = await this.http.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/` + lng + `,` + lat + `.json?access_token=pk.eyJ1IjoicmNkZCIsImEiOiJjajBiMHBsbWgwMDB2MnFud2NrODRocXNjIn0.UWZO6WuB6DPU6AMWt5Mr9A&types=address%2Cpoi%2Cpoi.landmark%2Clocality%2Cplace%2Cpostcode`).toPromise();
            let place = resp.json();
            //console.log("ReverseCoder", place);
            this.loading = false;
            if (place.features.length > 0) {
                return (place.features[0].properties.address != undefined ? place.features[0].properties.address : (lat + "," + lng));
            } else {
                return (lat + "," + lng);
            }
        }
        else {
            return (lat + "," + lng);
        }
    }

    async getDataFromServer(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.innit = 0;
            this.isUpdated().then((up) => {
                //console.log("up", up);
                if (!up) {
                    return this.getRoutes().then(() => {
                        this.innit = 10;
                        return this.getStationsFromBusLines().then(() => {
                            this.dataInfoToDB();
                            //console.log("Download DONE!", this.stops);
                            return this.createStorageFavoritesRoutes().then(() => {
                                /*console.log("DB Not updated!");
                                console.log("Innit download...");*/
                            })
                        })
                    });

                }
            }).then(() => {
                this.innit = 80;
                return this.getStopsFromDB().then((stops) => {
                    //this.innit = 100;
                    //console.log("Stops", Object.keys(stops).length);
                    //console.log("DB updated!");
                    resolve(this.stops)
                })
            });
        }).then((stops) => {
            //console.log("return promise then", Object.keys(this.stops).length);
            return this.stops;
        });
    }



    async populateCheckBoxs() {
        //console.log("populate", Object.keys(this.stops).length);
        for (var index = 0; index < Object.keys(this.stops).length; index++) {
            let route = this.stops[Object.keys(this.stops)[index]];
            //console.log("route: ", route);
            this.CheckBoxRoutes.push({ id: route, label: route.longName, type: "checkbox", value: route, checked: false });
            this.CheckBoxRoutes.sort(function (a, b) { return (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0); });
        };
    }

    async  isUpdated() {
        return await this.db.query("SELECT * FROM SETTINGS")
            .then(res => {
                let diff = (moment(new Date(), "YYYYMMDD").diff(res.rows.item(0).value, 'days'));
                //console.log("Diff time: ", diff);
                return (diff < 30 ? true : false);
            })
            .catch(err => {
                //alert("Cenas pah!");
                console.log("Error: ", err);
                return false;
            });
    }


    async DBDropTable(tableName: string) {
        await this.db.query("DROP TABLE " + tableName)
            .then(res => {
                console.log("Table Dropped: ", res);
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    queryDbDelete(tableName: string) {
        this.db.query("DELETE FROM " + tableName)
            .then(res => {
                // console.log("Result: ", res);
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async getStopsFromBusLine(_id: any) {
        let id = _id.split(":");
        let stops: any;
        return this.db.query("SELECT * FROM ID_" + id[1])
            .then(res => {
                stops = res;
                console.dir(stops);
                return stops;
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }
    ////////////////////////////////////// CENAS FIXES  //////////////////////////////////////////////////////////

    async getRoutes() {
        if (this.hasNetwork) {
            let resp = await this.http.get(`http://194.210.216.191/otp/routers/default/index/routes`).toPromise();
            for (let route of resp.json()) {
                this.lines.push(route);
                this.innit += 5;
            }
            await this.createStorageLines();
        } else {
            return this.noNetworkOnInit();
        }
    }

    async getStationsFromBusLines() {
        for (let route of this.lines) { // http://194.210.216.191/otp/routers/default/index/routes/" + route.id + "/stops
            this.innit += 5; //http://194.210.216.191/otp/routers/default/index/patterns/1:1018:0:01
            if (this.hasNetwork) {
                let stops = await this.http.get("http://194.210.216.191/otp/routers/default/index/patterns/" + route.id + "::01").toPromise();
                //console.dir(stops);
                await this.createStorageStops(route, stops.json());
            } else {
                return this.noNetworkOnInit();
            }
        }

    }

    async createStorageLines() {
        await this.DBDropTable("BUSLINES");

        await this.db.query("CREATE TABLE IF NOT EXISTS BUSLINES (AGENCYNAME TEXT, IDLINE TEXT, LONGNAME TEXT, MODE TEXT, SHORTNAME TEXT, COLOR TEXT)")
            .then(res => {
                console.log("lines", this.lines);
                this.lines.forEach(route => {
                    this.innit += 1;
                    this.db.query("INSERT INTO BUSLINES (AGENCYNAME, IDLINE, LONGNAME, MODE, SHORTNAME, COLOR) VALUES(?,?,?,?,?,?);", [route.agencyName, route.id, route.longName, route.mode, route.shortName, route.color]).then(res => {
                        // console.dir(res);
                    })
                        .catch(err => {
                            console.log("Error: ", err);
                        });
                });


            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async createStorageStops(route: any, stops: any) {
        let id = route.id.split(":");

        await this.DBDropTable("ID_" + id[1]);

        await this.db.query("CREATE TABLE IF NOT EXISTS ID_" + id[1] + " (name TEXT, id TEXT, lat TEXT, lon TEXT)")
            .then(res => {
                stops.stops.forEach(stp => {
                    //console.log("inserir linha " + id[1]);
                    this.db.query("INSERT INTO ID_" + id[1] + " (name, id, lat, lon) VALUES(?,?,?,?);", [stp.name, stp.id, stp.lat, stp.lon])
                });
            })

            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async createStorageFavoritesRoutes() {
        await this.DBDropTable("FAVORITES_ROUTES");

        await this.db.query("CREATE TABLE IF NOT EXISTS FAVORITES_ROUTES (DESCRIPTION TEXT, ORIGIN TEXT, DESTINATION TEXT)")
            .then(res => {
                console.log("CREATED FAVORITES_ROUTES IN BD");
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async getFavoritesFromDb() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM FAVORITES_ROUTES")
                .then(res => {
                    for (var i = 0; i < Object.keys(res.rows).length; i++) {
                        console.log(res.rows[i].DESCRIPTION);
                        this.favoritesRoutes.push({ description: res.rows[i].DESCRIPTION, origin: res.rows[i].ORIGIN, destination: res.rows[i].DESTINATION })
                    }
                    //this.favoritesRoutes = res;
                    resolve(this.favoritesRoutes);
                });
        }).then(() => {
            //console.log("Stops in getStopsFromDB", Object.keys(this.stops).length);
            return this.favoritesRoutes;
        });
    }


    async createFavoriteRoute(desc: string, origin: string, destination: string) {
        console.log(origin + "     " + destination);
        this.db.query("INSERT INTO FAVORITES_ROUTES (DESCRIPTION, ORIGIN, DESTINATION) VALUES(?,?,?);", [desc, origin, destination]).then(() => {
            console.log("FAVORITO ADDED");
            this.favoritesRoutes.push({ description: desc, origin: origin, destination: destination });
        }).catch(err => {
            console.log("Error: ", err);
        });

    }


    async dataInfoToDB() {
        await this.DBDropTable("SETTINGS");

        await this.db.query("CREATE TABLE IF NOT EXISTS SETTINGS (name TEXT, value TEXT)")
            .then(res => {
                this.db.query("INSERT INTO SETTINGS (name, value) VALUES(?,?);", ['timestamp', new Date().toISOString()])
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async getStopsFromDB() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM BUSLINES")
                .then(res => {
                    //console.log("BUSLINES:", res);
                    for (let i = 0; i < res.rows.length; i++) {
                        //console.log("BUSLINE " + res.rows.item(i).IDLINE);
                        let id = res.rows.item(i).IDLINE.split(":");
                        this.db.query("SELECT * FROM ID_" + id[1])
                            .then(resp => {
                                let stop: any[] = [];
                                //console.log("Stops from line " + id[1], resp.rows);
                                for (let i = 0; i < resp.rows.length; i++) {
                                    //console.log("stop cenas", resp.rows.item(i));
                                    stop.push(resp.rows.item(i))
                                }
                                this.stops[res.rows.item(i).IDLINE] = {};
                                this.stops[res.rows.item(i).IDLINE].id = res.rows.item(i).IDLINE;
                                this.stops[res.rows.item(i).IDLINE].longName = res.rows.item(i).LONGNAME;
                                this.stops[res.rows.item(i).IDLINE].shortName = res.rows.item(i).SHORTNAME;
                                this.stops[res.rows.item(i).IDLINE].color = res.rows.item(i).COLOR;
                                this.stops[res.rows.item(i).IDLINE].stops = stop;
                                this.innit += 1;
                                if (Object.keys(this.stops).length == res.rows.length) {
                                    resolve(this.stops);
                                }
                            })
                            .catch(err => {
                                console.log("Error: ", err);
                            })
                    }
                })
                .catch(err => {
                    console.log("Error: ", err);
                })
        }).then(() => {
            //console.log("Stops in getStopsFromDB", Object.keys(this.stops).length);
            return this.stops;
        });
    }

    async getTimeFromStop(stop: any, time: any) {
        this.loading = true;
        let date = moment(time).format("YYYYMMDD");
        let resp = await this.http.get("http://194.210.216.191/otp/routers/default/index/stops/" + stop + "/stoptimes/" + date).toPromise();
        let respj = resp.json();
        respj.forEach(pat => {
            //console.log(pat.pattern.id);
            this.CheckBoxRoutes.forEach(line => {
                //console.log(line.id.color);
                if (line.id.id.split(':')[0] + line.id.id.split(':')[1] == pat.pattern.id.split(':')[0] + pat.pattern.id.split(':')[1]) {
                    pat.pattern.color = "#" + line.id.color;
                    // console.log(line.id,pat.color);
                }
            });

        });
        this.loading = false;
        return respj;
    }

    getNetworkState() {
        return this.hasNetwork;
    }

    setNetworkState(val: boolean) {
        this.hasNetwork = val;
    }

    getCheckBoxRoutes() {
        return this.CheckBoxRoutes;
    }

    async noNetworkOnInit() {
        let alert = this.alertCtrl.create({
            title: "No Internet Connection",
            subTitle: "You app is out of date! Please turn on your network and run app again!",
            buttons: [{
                text: 'Ok',
                handler: () => {
                    this.DBDropTable("SETTINGS").then(() => {
                        this.hasNetwork = null;
                        this.platform.exitApp();
                    });
                }
            }]
        });
        alert.present();
        return;
    }
}
