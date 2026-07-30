const calendar = document.querySelector('.calendar');
const calendarStatus = document.querySelector('.calendar-status');
let calendarTimeout;

const showCalendarError = (message) => {
  clearTimeout(calendarTimeout);
  calendarStatus.classList.remove('is-loading', 'hidden');
  calendarStatus.textContent = message;
};

const startCalendarTimeout = () => {
  clearTimeout(calendarTimeout);
  calendarTimeout = setTimeout(() => {
    if (!calendarStatus.classList.contains('hidden')) {
      calendarStatus.textContent =
        'The calendar is taking longer than expected. You can open it in a new tab.';
    }
  }, 10000);
};

const retryCalendar = () => {
  if (!calendar || calendarStatus.classList.contains('hidden')) {
    return;
  }

  calendarStatus.classList.add('is-loading');
  calendarStatus.textContent = 'Loading calendar…';
  calendar.src = calendar.src;
  startCalendarTimeout();
};

calendar?.addEventListener('load', () => {
  if (!navigator.onLine) {
    showCalendarError('You appear to be offline. The calendar will retry when you reconnect.');
    return;
  }

  clearTimeout(calendarTimeout);
  calendarStatus.classList.add('hidden');
});

calendar?.addEventListener('error', () => {
  showCalendarError('The calendar could not load. Use the link above to open it in a new tab.');
});

if (calendar) {
  if (!navigator.onLine) {
    showCalendarError('You appear to be offline. The calendar will retry when you reconnect.');
  } else {
    startCalendarTimeout();
  }

  window.addEventListener('online', retryCalendar);
}
