import { Component, OnInit } from '@angular/core';
import { Insomnia } from '@ionic-native/insomnia/ngx';
import { NavigationBar } from '@ionic-native/navigation-bar/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AlertController } from '@ionic/angular';
import { Plugins, LocalNotificationEnabledResult, LocalNotificationActionPerformed, LocalNotification, Device, LocalNotificationPendingList } from '@capacitor/core';
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
  minutes: number = 0;
  seconds: any = 10;
  timer: any = false;
  overallTimer: any = false;
  fullTime: any = '00:00:10';
  notifier: any = false;
  // countDownTimer: any = false;
  timeLeft: any = {
    minutes: '00',
    seconds: '10',
    elapsed: 0,
    bgTime: 0,
    totalSeconds: 0
  };
  remainingTime = `${this.timeLeft.minutes}:${this.timeLeft.seconds}`;
  reminders: any = [
    { message: 'Please close your eyes for 20 seconds.' },
    { message: 'Please look 20 feet away for 20 seconds.' }
  ]

  constructor(private insomnia: Insomnia, private navigationBar: NavigationBar, 
    private alertCtrl: AlertController, private backgroundMode: BackgroundMode) {

    let autoHide: boolean = true;
    this.navigationBar.setUp(autoHide);

    this.backgroundMode.enable();
    this.backgroundMode.on("activate").subscribe(() => {
      this.setTimeLeft(); //.then(() => { this.stopTimer(); });
    });
    this.backgroundMode.on("deactivate").subscribe(() => {
      this.getTimeLeft(); //.then(() => { this.startTimer(); });
    });
  }

  async ngOnInit() {
    await LocalNotifications.requestPermission();
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

  touchMe() {
    console.log('touched');
  }

  startTimer() {

    if (this.timer) {
      clearInterval(this.timer);
      // clearInterval(this.countDownTimer);
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
    this.timeLeft.elapsed = 0;

    let forwardsTimer = () => {
      // if (this.percent == this.radius) this.resetTimer() //clearInterval(this.timer)
      console.log('secondsLeft A -', secondsLeft);
      console.log('progress A -', this.progress);

      if (secondsLeft >= 0) {
        this.percent = Math.floor((this.progress / totalSeconds) * 100)
        ++this.progress

        this.timeLeft.minutes = Math.floor(secondsLeft / 60)
        this.timeLeft.seconds = secondsLeft - (60 * this.timeLeft.minutes)
        this.timeLeft.elapsed++;
        this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`

        if (secondsLeft == 0) 
        {
          this.resetTimer();
          this.percent = 100;
          this.progress = 1;
          secondsLeft = totalSeconds;
        }

        secondsLeft--;
      }

      console.log('secondsLeft B -', secondsLeft);
      console.log('progress B -', this.progress);
    }

    // let backwardsTimer = () => {
    //   console.log(secondsLeft);
    //   if (secondsLeft >= 0) {
    //     this.timeLeft.minutes = Math.floor(secondsLeft / 60)
    //     this.timeLeft.seconds = secondsLeft - (60 * this.timeLeft.minutes)
    //     this.timeLeft.elapsed++;
    //     this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`
    //     secondsLeft--;
    //     if (secondsLeft < 0) secondsLeft = totalSeconds;
    //   }
    // }

    // run once when clicked
    forwardsTimer()
    // backwardsTimer()
    if (!this.notifier) this.scheduleNotification(totalSeconds+1);

    // timers start 1 second later
    // this.countDownTimer = setInterval(backwardsTimer, 1000)
    this.timer = setInterval(forwardsTimer, 1000)
  }

  async scheduleNotification(seconds) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Yeyet Reminder',
          body: this.reminders[Math.floor(Math.random() * this.reminders.length)].message,
          id: 1,
          schedule:
          {
            every: 'second',
            count: seconds
          },
        }
      ]
    }).then(() => { this.notifier = true });
    // console.log('this.scheduleNotification', seconds);
  }

  stopTimer() {
    this.cancelNotification();
    this.clearTimerInterval();
    // this.countDownTimer = false;
    this.overallTimer = false;
    this.timer = false;
    this.resetTimer();
    this.insomnia.allowSleepAgain()
  }

  resetTimer() {
    console.log('reset timer');
    this.percent = 0;
    this.progress = 0;
    this.elapsed = {
      h: '00',
      m: '00',
      s: '00'
    }
    this.timeLeft = {
      minutes: '00',
      seconds: '10',
      elapsed: 0,
      bgTime: 0,
      totalSeconds: 0,
      progress: 0,
      percent: 0
    }
    this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`;

  }

  clearTimerInterval() {
    // clearInterval(this.countDownTimer);
    clearInterval(this.timer);
    clearInterval(this.overallTimer);
  }

  cancelNotification() {
    const pending: LocalNotificationPendingList = {
      notifications: [
        {
          id: '1'
        },
      ],
    };
    // console.log('this.cancelNotification');
    this.notifier = false;
    return LocalNotifications.cancel(pending);
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
