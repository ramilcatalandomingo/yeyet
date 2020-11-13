import { Component, OnInit } from '@angular/core';
import { Insomnia } from '@ionic-native/insomnia/ngx';
import { NavigationBar } from '@ionic-native/navigation-bar/ngx';
import { Plugins, LocalNotificationEnabledResult, LocalNotificationActionPerformed, LocalNotification, Device, LocalNotificationPendingList } from '@capacitor/core';
import { AlertController } from '@ionic/angular';
const { LocalNotifications, App, BackgroundTask, Storage } = Plugins;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  elapsed: any = {
    h: '00',
    m: '00',
    s: '00'
  }
  progress: any = 0;
  overallProgress: any = 0;
  percent: number = 0;
  radius: number = 100;
  minutes: number = 2;
  seconds: any = 0;
  timer: any = false;
  overallTimer: any = false;
  fullTime: any = '00:02:00';
  notifier: any = false;
  countDownTimer: any = false;
  timeLeft: any = {
    minutes: '02',
    seconds: '00',
    elapsed: 0,
    bgTime: 0,
    totalSeconds: 0
  };
  remainingTime = `${this.timeLeft.minutes}:${this.timeLeft.seconds}`;

  constructor(private insomnia: Insomnia, private navigationBar: NavigationBar, private alertCtrl: AlertController) {

    let autoHide: boolean = true;
    this.navigationBar.setUp(autoHide);

  }

  async ngOnInit() {
    await LocalNotifications.requestPermission();

    LocalNotifications.addListener('localNotificationReceived', (notification: LocalNotification) => {
      // this.presentAlert(`Received: ${notification.title}`, `${notification.body}`);
      // console.log(`Received: ${notification.title}`, `${notification.body}`);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notification: LocalNotificationActionPerformed) => {
      // this.presentAlert(`Performed: ${notification.actionId}`, null);
      // console.log(`Performed: ${notification.actionId}`, null);
    });

    App.addListener('appStateChange', (state) => {

      if (!state.isActive) {
        // The app has become inactive. We should check if we have some work left to do, and, if so,
        // execute a background task that will allow us to finish that work before the OS
        // suspends or terminates our app:
    
        let taskId = BackgroundTask.beforeExit(async () => {
          // In this function We might finish an upload, let a network request
          // finish, persist some data, or perform some other task

          this.setTimeLeft().then(() => { this.stopTimer(); });

          // Must call in order to end our task otherwise
          // we risk our app being terminated, and possibly
          // being labeled as impacting battery life

          BackgroundTask.finish({
            taskId
          });
        });
      } else {
        this.getTimeLeft().then(() => { this.startTimer(); });
      }
    })
  }

  async setTimeLeft() {
    
    this.timeLeft.bgTime = new Date().getTime(); // Set the current time when backgrounded

    await Storage.set({
      key: 'timeLeft',
      value: JSON.stringify(this.timeLeft)
    });
  }
  
  async getTimeLeft() {

    await Storage.get({ key: 'timeLeft' }).then((result) => {
      this.timeLeft = JSON.parse(result.value);

      var fgTime = new Date().getTime(); // Get the foregrounded time
      var bgTime = new Date(this.timeLeft.bgTime).getTime(); // Get the backgrounded time
      var ms = fgTime - bgTime; // Get the difference in milliseconds
      var s = Math.round(ms / 1000); // Convert from milliseconds to seconds
      var remainder = parseInt(this.timeLeft.totalSeconds) - parseInt(this.timeLeft.elapsed) - (s > parseInt(this.timeLeft.totalSeconds) ? s % parseInt(this.timeLeft.totalSeconds) : s); // Get the remainder seconds based on total seconds from setup
      
      this.progress = this.timeLeft.totalSeconds - remainder;
      this.percent = Math.floor((this.progress / parseInt(this.timeLeft.totalSeconds)) * 100)

      this.timeLeft.minutes = Math.floor(remainder / 60)
      this.timeLeft.seconds = remainder - (60 * this.timeLeft.minutes)
      this.fullTime = `00:${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`
      this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`;
    });
  }

  async presentAlert(header, message) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });

    await alert.present();
  }

  touchMe() {
    console.log('touched');
  }

  startTimer() {

    if (this.timer) {
      clearInterval(this.timer);
      clearInterval(this.countDownTimer);
    }
    if (!this.overallTimer) {
      this.progressTimer();
      this.insomnia.keepAwake()
    }

    this.timer = false;
    // this.percent = 0;
    // this.progress = 0;

    let timeSplit = this.fullTime.split(':');
    this.minutes = timeSplit[1];
    this.seconds = timeSplit[2];

    let totalSeconds = Math.floor(this.minutes * 60) + parseInt(this.seconds);
    let secondsLeft = totalSeconds;
    this.timeLeft.totalSeconds = totalSeconds;

    let forwardsTimer = () => {
      if (this.percent == this.radius) this.resetTimer()
      ++this.progress
      this.percent = Math.floor((this.progress / totalSeconds) * 100)
      
      // console.log('progress', this.progress);
      // console.log('percent', this.percent)
    }

    let backwardsTimer = () => {
      if (secondsLeft >= 0) {
        this.timeLeft.minutes = Math.floor(secondsLeft / 60)
        this.timeLeft.seconds = secondsLeft - (60 * this.timeLeft.minutes)
        this.timeLeft.elapsed++;
        this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`
        secondsLeft--;

        if (secondsLeft < 0) secondsLeft = totalSeconds;
      }
    }

    // run once when clicked
    forwardsTimer()
    backwardsTimer()
    if (!this.notifier) this.scheduleNotification(totalSeconds);

    // timers start 1 second later
    this.countDownTimer = setInterval(backwardsTimer, 1000)
    this.timer = setInterval(forwardsTimer, 1000)

  }

  async scheduleNotification(seconds) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Yeyet Reminder',
          body: 'Please take a quick break from your screen or device by looking 20 feet away or by closing your eyes for 20 seconds.',
          id: 1,
          schedule:
          {
            every: 'second',
            count: seconds
          },
        }
      ]
    }).then(() => { this.notifier = true });
    console.log('this.scheduleNotification');
  }

  cancelNotification() {
    const pending: LocalNotificationPendingList = {
      notifications: [
        {
          id: '1'
        },
      ],
    };
    console.log('this.cancelNotification');
    this.notifier = false;
    return LocalNotifications.cancel(pending);
  }

  stopTimer() {

    this.clearTimerInterval();
    this.countDownTimer = false;
    this.overallTimer = false;
    this.timer = false;
    this.resetTimer();
    this.insomnia.allowSleepAgain()
  }

  resetTimer() {

    this.percent = 0;
    this.progress = 0;
    this.elapsed = {
      h: '00',
      m: '00',
      s: '00'
    }
    this.timeLeft = {
      minutes: '02',
      seconds: '00',
      elapsed: 0,
      bgTime: 0,
      totalSeconds: 0,
      progress: 0,
      percent: 0
    }
    this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`;

  }

  clearTimerInterval() {

    clearInterval(this.countDownTimer);
    clearInterval(this.timer);
    clearInterval(this.overallTimer);

  }

  progressTimer() {
    let countDownDate = new Date();

    this.overallTimer = setInterval(() => {
      let now = new Date().getTime();

      // Find the distance between now an the count down date
      var distance = now - countDownDate.getTime();

      // Time calculations for hours, minutes and seconds

      this.elapsed.h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      this.elapsed.m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.elapsed.s = Math.floor((distance % (1000 * 60)) / 1000);

      this.elapsed.h = this.pad(this.elapsed.h, 2);
      this.elapsed.m = this.pad(this.elapsed.m, 2);
      this.elapsed.s = this.pad(this.elapsed.s, 2);

    }, 1000)
  }

  pad(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  updateMyDate($event) {
    console.log($event.split(":"));
  }

}
