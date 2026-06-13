/**
 * SLA deadline math — pure, framework-free, unit-tested.
 *
 * Adds `hours` of WORKING time to a start instant, skipping the weekend.
 * The working week is Sunday–Thursday (Friday=5 and Saturday=6 are the
 * weekend) to match the platform's primary market. Extracted from
 * TicketContext so the SLA contract can be verified in isolation.
 */
export const addSlaHours = (startDate: Date | string, hours: number): string => {
  const date = new Date(startDate);
  let remainingHours = hours;
  while (remainingHours > 0) {
    date.setTime(date.getTime() + 60 * 60 * 1000);
    const day = date.getDay(); // 0=Sun … 5=Fri, 6=Sat
    if (day !== 5 && day !== 6) {
      remainingHours--;
    }
  }
  return date.toISOString();
};
