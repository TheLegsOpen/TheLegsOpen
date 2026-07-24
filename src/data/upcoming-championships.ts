export interface UpcomingChampionship {
  number: number;
  year: number;
  venueSlug: string;
  dates: string;
  ballotCloses: string;
}

export const UPCOMING_CHAMPIONSHIPS: UpcomingChampionship[] = [
  {
    number: 155,
    year: 2027,
    venueSlug: "marram-bay-links",
    dates: "15–18 July 2027",
    ballotCloses: "2027-02-01T17:00:00Z",
  },
];
