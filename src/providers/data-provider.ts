import { Injectable } from '@angular/core';
import { Platform, AlertController, ToastController } from 'ionic-angular';
import 'rxjs/Rx';
import { DatabaseProvider } from './database-provider';
import { Http, Headers, RequestOptions } from '@angular/http';
import { TranslateService } from '@ngx-translate/core';

import 'moment';

declare var moment: any;

@Injectable()
export class DataProvider {

    private ipOTP = '194.210.216.191';

    public lines: any = [];
    public stops: any[] = [];
    public innit: number = 0;
    public loading: boolean = false;
    public loadingText: string = "";
    public CheckBoxRoutes: any = [];
    public hasNetwork: boolean = null;
    public favoritesRoutes: any = [];
    public favoritesPlaces: any = [];
    public favoriteToRoute: any;
    public favoriteToPlace: any;

    public test: any;



    constructor(private http: Http, private db: DatabaseProvider, public toastCtrl: ToastController,
        private alertCtrl: AlertController, private platform: Platform, public translate: TranslateService) {
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

            let resp = await this.http.get(`http://` + this.ipOTP + `/otp/routers/default/plan?fromPlace=` + origin + `&toPlace=` + destination + `&time=` + time + `&date=` + date + `&mode=WALK%2CBUS%2CTRANSIT&maxWalkDistance=50000&showIntermediateStops=true`).toPromise();
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
            let lang: string = this.translate.currentLang;
            //let key = 'AIzaSyD1i1kgXFRinKusaftvainJ6lqVvIgIfSU'; //PEREIRA
            let key = 'AIzaSyCIAsIQk7fTx3KomXq0fE6klhA8mP5jKtY'; //DOMINGUES
            let resp = await this.http.get(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=39.7454901,-8.807645&language=` + lang + `&radius=6000&keyword=` + keyword + `&key=` + key, options).toPromise();
            console.log("searchPlaces", resp.json());
            if (resp.json().status != "OK" && resp.json().error_message) {
                let toast = this.toastCtrl.create({
                    message: resp.json().error_message,
                    duration: 3000,
                    position: 'top',
                    showCloseButton: true
                });

                toast.present();
            }
            let res = resp.json().results;
            res.reverse();
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
                            res.push({ "id": stop.id, "name": stop.name, "icon": "assets/img/android-bus.png", "geometry": { "location": { "lat": stop.lat, "lng": stop.lon } } });
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
            // GOOGLE
            let key = 'AIzaSyCIAsIQk7fTx3KomXq0fE6klhA8mP5jKtY';
            let resp = await this.http.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=` + lat + `,` + lng + `&key=` + key).toPromise();
            let place = resp.json();
            this.loading = false;
            if (place.results.length > 0) {
                return (place.results[0].formatted_address != undefined ? place.results[0].formatted_address : (lat + "," + lng));
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
                if (!up) {
                    return this.getRoutes().then(() => {
                        this.innit = 10;
                        this.loadingText = this.translate.instant("DATAPROVIDER.LOADING_TXT.ROUTES");
                        return this.getStationsFromBusLines().then(() => {
                            this.loadingText = this.translate.instant("DATAPROVIDER.LOADING_TXT.STOPS");
                            this.dataInfoToDB();
                            return this.createStorageFavoritesRoutes().then(() => {
                                this.loadingText = this.translate.instant("DATAPROVIDER.LOADING_TXT.FAVORITES_CREATE");
                                return this.createStorageFavoritesPlaces().then(() => {
                                    this.loadingText = this.translate.instant("DATAPROVIDER.LOADING_TXT.FAVORITES_CREATE");
                                });
                            });
                        });
                    });
                }
            }).then(() => {
                this.innit = 80;
                return this.getStopsFromDB().then((stops) => {
                    this.loadingText = this.translate.instant("DATAPROVIDER.LOADING_TXT.STOPS_LOADING");
                    this.getFavoritesFromDB().then(fav => {
                        resolve();
                    })
                });
            });
        }).then((stops) => {
            return this.stops;
        });
    }

    async getFavoritesFromDB() {
        new Promise((resolve, reject) => {
            return this.getFavoritesRoutesFromDb().then(favRoutes => {
                this.loadingText = this.translate.instant("DATAPROVIDER.LOADING_TXT.FAVORITES_LOADING");
                this.favoritesRoutes = favRoutes;
            }).then((s) => {
                this.getFavoritesPlacesFromDb().then(favPlaces => {
                    this.favoritesPlaces = favPlaces;
                    resolve(favPlaces);
                });
            });
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
                return (diff < 30 ? true : false);
            })
            .catch(err => {
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
            let resp = await this.http.get("http://" + this.ipOTP + "/otp/routers/default/index/routes").toPromise();
            for (let route of resp.json()) {
                console.log("Routes", route);
                if (route.shortName == undefined) {
                    route.shortName = 'Mob.Tour';
                }
                this.lines.push(route);
                this.innit += 5;
            }
            await this.createStorageLines();
        } else {
            return this.noNetworkOnInit();
        }
    }

    async getStationsFromBusLines() {
        //////////////////////////////////////////////////////////
        //          TODO:VERIFICAR PATTERN DAS STOPS            //
        //////////////////////////////////////////////////////////
        for (let route of this.lines) { // http://` + this.ipOTP + `/otp/routers/default/index/routes/" + route.id + "/stops
            this.innit += 5; //http://` + this.ipOTP + `/otp/routers/default/index/patterns/1:1018:0:01
            if (this.hasNetwork) {
                let stops = await this.http.get("http://" + this.ipOTP + "/otp/routers/default/index/patterns/" + route.id + "::01").toPromise();
                console.dir(stops);
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
                this.lines.forEach(route => {
                    this.innit += 1;
                    this.db.query("INSERT INTO BUSLINES (AGENCYNAME, IDLINE, LONGNAME, MODE, SHORTNAME, COLOR) VALUES(?,?,?,?,?,?);", [route.agencyName, route.id, route.longName, route.mode, route.shortName, route.color]).then(res => {
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
    async createStorageFavoritesPlaces() {

        await this.db.query("CREATE TABLE IF NOT EXISTS FAVORITES_PLACES (DESCRIPTION TEXT, COORDINATES TEXT)")
            .then(res => {
                console.log("CREATED FAVORITES_PLACES IN BD");
            })
            .catch(err => {
                console.log("Error: ", err);
            });
    }

    async getFavoritesRoutesFromDb() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM FAVORITES_ROUTES")
                .then(res => {
                    this.favoritesRoutes = [];
                    if (res.rows.length > 0) {
                        for (let i = 0; i < res.rows.length; i++) {
                            this.favoritesRoutes.push({
                                "description": res.rows.item(i).DESCRIPTION,
                                "origin": res.rows.item(i).ORIGIN,
                                "destination": res.rows.item(i).DESTINATION
                            })
                        }
                        resolve(this.favoritesRoutes);
                    } else {
                        reject();
                    }
                })
                .catch(err => {
                    console.log("Error: ", err);
                    reject(this.favoritesRoutes);
                });

        }).then(() => {
            return this.favoritesRoutes;
        }).catch(() => {
            return null;
        });
    }

    async getFavoritesPlacesFromDb() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM FAVORITES_PLACES")
                .then(res => {
                    this.favoritesPlaces = [];
                    if (res.rows.length > 0) {
                        for (let i = 0; i < res.rows.length; i++) {
                            this.favoritesPlaces.push({
                                "description": res.rows.item(i).DESCRIPTION,
                                "coords": res.rows.item(i).COORDINATES
                            })
                        }
                        resolve(this.favoritesPlaces);
                    } else {
                        reject();
                    }
                })
                .catch(err => {
                    console.log("Error: ", err);
                    reject(this.favoritesPlaces);
                });
        }).then(() => {
            return this.favoritesPlaces;
        }).catch(() => {
            return null;
        });
    }

    async  createFavoriteRoute(desc: string, origin: string, destination: string) {
        return new Promise((resolve, reject) => {
            desc = desc.replace(/'/g, "");
            this.getFavoritesRoutesFromDb().then(res => {
                if (res != null) {
                    for (var i = 0; i < res.length; i++) {
                        if (this.removeAccents(res[i].description).toLowerCase().trim() == this.removeAccents(desc).toLowerCase().trim()) {
                            reject(res);
                        }
                    }
                }
                resolve(res);
            });

        }).then(() => {
            this.db.query("INSERT INTO FAVORITES_ROUTES (DESCRIPTION, ORIGIN, DESTINATION) VALUES(?,?,?);", [desc, origin, destination])
                .then((res) => {
                    this.favoritesRoutes.push({ description: desc, origin: origin, destination: destination });
                    console.log("FAVORITO ADDED", this.favoritesRoutes);
                }).catch(err => {
                    console.log("Favorite Error: ", err);
                });
            return true;
        }).catch(() => {
            console.log("reject");
            return false;
        });
    }

    async  createFavoritePlace(desc: string, coords: string) {
        return new Promise((resolve, reject) => {
            desc = desc.replace(/'/g, "");
            this.getFavoritesPlacesFromDb().then(res => {
                if (res != null) {
                    for (var i = 0; i < res.length; i++) {
                        if (this.removeAccents(res[i].description).toLowerCase().trim() == this.removeAccents(desc).toLowerCase().trim()) {
                            reject(res);
                        }
                    }
                }
                resolve(res);
            });
        }).then(() => {
            this.db.query("INSERT INTO FAVORITES_PLACES (DESCRIPTION, COORDINATES) VALUES(?,?);", [desc, coords])
                .then((res) => {
                    this.favoritesPlaces.push({ description: desc, coords: coords });
                    console.log("FAVORITO ADDED", this.favoritesPlaces);
                }).catch(err => {
                    console.log("Favorite Error: ", err);
                });
            return true;
        }).catch(() => {
            console.log("reject");
            return false;
        });
    }

    async dataInfoToDB() {
        //////////////////////////////////////////////////////////////////
        //             TODO: UPDATE TABLE NOT DROP                      //
        //////////////////////////////////////////////////////////////////
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
                    for (let i = 0; i < res.rows.length; i++) {
                        let id = res.rows.item(i).IDLINE.split(":");
                        this.db.query("SELECT * FROM ID_" + id[1])
                            .then(resp => {
                                let stop: any[] = [];
                                for (let i = 0; i < resp.rows.length; i++) {
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
            return this.stops;
        });
    }

    async getTimeFromStop(stop: any, time: any) {
        this.loading = true;
        let date = moment(time).format("YYYYMMDD");
        let resp = await this.http.get("http://" + this.ipOTP + "/otp/routers/default/index/stops/" + stop + "/stoptimes/" + date).toPromise();
        let respj = resp.json();
        respj.forEach(pat => {
            this.CheckBoxRoutes.forEach(line => {
                if (line.id.id.split(':')[0] + line.id.id.split(':')[1] == pat.pattern.id.split(':')[0] + pat.pattern.id.split(':')[1]) {
                    pat.pattern.color = "#" + line.id.color;
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
            title: this.translate.instant("DATAPROVIDER.NETWORK_ALERT.TITLE"),
            subTitle: this.translate.instant("DATAPROVIDER.NETWORK_ALERT.SUBTITLE"),
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

    public setFavoriteRoute(fav: any) {
        this.favoriteToRoute = fav;
    }

    public getFavoriteRoute() {
        return this.favoriteToRoute;
    }

    public setFavoritePlace(fav: any) {
        this.favoriteToPlace = fav;
    }

    public getFavoritePlace() {
        return this.favoriteToPlace;
    }
    public getAllFavoritesPlaces() {
        return this.favoritesPlaces;
    }
    public deleteFavoriteRoute(fav: any) {
        new Promise((resolve, reject) => {
            let index: number = this.favoritesRoutes.indexOf(fav);
            if (index !== -1) {
                this.favoritesRoutes.splice(index, 1);
                this.deleteFavRouteFromBd(fav).then(() => {
                    resolve();
                })
            } else {
                reject();
            }
        });
    }

    public deleteFavoritePlace(fav: any) {
        new Promise((resolve, reject) => {
            fav.description = fav.description.replace(/'/g, "");
            let index: number = this.favoritesPlaces.indexOf(fav);
            if (index !== -1) {
                this.favoritesPlaces.splice(index, 1);
                this.deleteFavPlaceFromBd(fav).then(() => {
                    resolve();
                })
            } else {
                reject();
            }
        });
    }

    public removeFavoritePlace(fav: any) {
        return new Promise((resolve, reject) => {
            fav.description = fav.description.replace(/'/g, "");
            for (let i = 0; i < this.favoritesPlaces.length; i++) {
                if (this.favoritesPlaces[i].description == fav.description) {
                    this.favoritesPlaces.splice(i, 1);
                    this.deleteFavPlaceFromBd(fav);
                    resolve();
                }
            }
            reject();
        });
    }

    private deleteFavRouteFromBd(fav) {
        return new Promise((resolve, reject) => {
            this.db.query("DELETE FROM FAVORITES_ROUTES WHERE DESCRIPTION = '" + fav.description + "';").then(res => {
                console.log(fav.description + " Deleted");
                resolve();
            }).catch(err => {
                console.log(err);
                reject();
            });

        });

    }
    private deleteFavPlaceFromBd(fav) {
        return new Promise((resolve, reject) => {
            this.db.query("DELETE FROM FAVORITES_PLACES WHERE DESCRIPTION = '" + fav.description + "';").then(res => {
                console.log(fav.description + " Deleted");
                resolve();
            }).catch(err => {
                console.log(err);
                reject();
            });

        });
    }
}
