import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Insomnia } from '@ionic-native/insomnia/ngx';
import { NavigationBar } from '@ionic-native/navigation-bar/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AlertController } from '@ionic/angular';
import { Plugins, LocalNotificationEnabledResult, LocalNotificationActionPerformed, LocalNotification, Device, LocalNotificationPendingList } from '@capacitor/core';
import { CircleProgressComponent } from 'ng-circle-progress';
const { LocalNotifications, App, BackgroundTask, Storage } = Plugins;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})


export class HomePage implements OnInit {

  @ViewChild(CircleProgressComponent) circleProgress: CircleProgressComponent;

  // elapsed: any = {
  //   h: '00',
  //   m: '00',
  //   s: '00'
  // }
  progress: any = 0;
  overallProgress: any = 0;
  percent: number = 0;
  radius: number = 100;
  minutes: number = 0;
  seconds: any = 0;
  timer: any = false;
  // overallTimer: any = false;
  // fullTime: any = '00:01:00';
  notifier: any = false;
  // countDownTimer: any = false;
  totalSeconds: number = 60;
  secondsLeft: number = 0;
  timeLeft: any = {
    minutes: '01',
    seconds: '00',
    bgTime: 0,
    progress: 0,
    totalSeconds: 0
  };
  remainingTime = `${this.timeLeft.minutes}:${this.timeLeft.seconds}`;
  reminders: any = [
    { message: 'Please close your eyes for 20 seconds.' },
    { message: 'Please look 20 feet away for 20 seconds.' }
  ];
  isActive: boolean = true;

  constructor(private insomnia: Insomnia, private navigationBar: NavigationBar, 
    private alertCtrl: AlertController, private backgroundMode: BackgroundMode) {

    this.navigationBar.setUp(true);
  }

  async ngOnInit() {
    await LocalNotifications.requestPermission();
  
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
        this.getTimeLeft().then(() => { this.startTimer(true); });
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

      console.log('1. timeLeft', JSON.stringify(this.timeLeft));

      var fgTime = new Date().getTime(); // Get the foregrounded time
      var bgTime = new Date(this.timeLeft.bgTime).getTime(); // Get the backgrounded time
      var ms = fgTime - bgTime; // Get the difference in milliseconds
      var elapsed = Math.round(ms / 1000) + parseInt(this.timeLeft.progress); // Convert from milliseconds to seconds

      console.log('milliseconds', ms);
      console.log('elapsed', elapsed);

      this.secondsLeft = parseInt(this.timeLeft.totalSeconds) - (elapsed > parseInt(this.timeLeft.totalSeconds) ? elapsed % parseInt(this.timeLeft.totalSeconds) : elapsed); // Get the remainder seconds based on total seconds from setup
      this.progress = Math.abs(this.secondsLeft - this.timeLeft.totalSeconds);
      this.percent = Math.floor((this.progress / parseInt(this.timeLeft.totalSeconds)) * 100)

      console.log('secondsleft', this.secondsLeft);
      console.log('progress', this.progress);

      this.timeLeft.minutes = Math.floor(this.secondsLeft / 60)
      this.timeLeft.seconds = this.secondsLeft - (60 * this.timeLeft.minutes)
      // this.fullTime = `00:${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`
      this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`;

      console.log('2. timeLeft', JSON.stringify(this.timeLeft));

    });
  }

  touchMe() {
    console.log('touched');
  }

  startTimer(resume) {

    this.isActive = true;

    if (!resume)
    {
      this.timer = false;
      this.secondsLeft = this.totalSeconds;
      this.timeLeft.totalSeconds = this.totalSeconds;
    } else {
      this.circleProgress.render();
    }

    // this.insomnia.keepAwake()

    let forwardsTimer = () => {
      console.log('1. secondsLeft', this.secondsLeft);
      console.log('2. progress', this.progress);
      console.log('3. percent', this.percent);
      console.log('4. remainingTime', this.remainingTime);
      console.log('5. isActive', this.isActive);

      if (this.secondsLeft >= 0) {
        this.percent = Math.floor((this.progress / this.totalSeconds) * 100)
        ++this.progress

        this.timeLeft.minutes = Math.floor(this.secondsLeft / 60)
        this.timeLeft.seconds = this.secondsLeft - (60 * this.timeLeft.minutes)
        this.timeLeft.progress = this.progress;
        this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`

        if (this.secondsLeft == 0) 
        {
          this.resetTimer();
          this.percent = 100;
          this.progress = 1;
        }

        this.secondsLeft--;
      }
    }

    // run once when clicked
    forwardsTimer();
    if (!this.notifier) this.scheduleNotification();

    // timers start 1 second later
    this.timer = setInterval(forwardsTimer, 1000)
  }

  async scheduleNotification() {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'Yeyet Reminder',
          body: this.reminders[Math.floor(Math.random() * this.reminders.length)].message,
          id: 1,
          schedule:
          {
            every: 'second',
            count: this.totalSeconds
          }
        }
      ]
    });
    this.notifier = true
    // console.log('this.scheduleNotification', seconds);
  }

  stopTimer() {
    this.cancelNotification();
    // this.clearTimerInterval();
    // this.countDownTimer = false;
    // this.overallTimer = false;
    this.isActive = false;
    clearInterval(this.timer);
    this.timer = false;
    this.resetTimer();
    // this.insomnia.allowSleepAgain()
  }

  resetTimer() {
    this.percent = 0;
    this.progress = 0;
    this.secondsLeft = this.totalSeconds;
    this.timeLeft = {
      minutes: '01',
      seconds: '00',
      bgTime: 0,
      progress: 0,
      totalSeconds: 0
    };
    this.timeLeft.totalSeconds = this.totalSeconds;
    this.remainingTime = `${this.pad(this.timeLeft.minutes, 2)}:${this.pad(this.timeLeft.seconds, 2)}`;
  }

  // clearTimerInterval() {
  //   clearInterval(this.countDownTimer);
  //   clearInterval(this.timer);
  //   clearInterval(this.overallTimer);
  // }

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

  // progressTimer() {
  //   let countDownDate = new Date();

  //   this.overallTimer = setInterval(() => {
  //     let now = new Date().getTime();

  //     // Find the distance between now an the count down date
  //     var distance = now - countDownDate.getTime();

  //     // Time calculations for hours, minutes and seconds

  //     this.elapsed.h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  //     this.elapsed.m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  //     this.elapsed.s = Math.floor((distance % (1000 * 60)) / 1000);

  //     this.elapsed.h = this.pad(this.elapsed.h, 2);
  //     this.elapsed.m = this.pad(this.elapsed.m, 2);
  //     this.elapsed.s = this.pad(this.elapsed.s, 2);

  //   }, 1000)
  // }

  pad(num, size) {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }

  updateMyDate($event) {
    console.log($event.split(":"));
  }

  setOptions() {
    
  }
}
