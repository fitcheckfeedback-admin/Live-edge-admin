// Curated star players per team (May 2026 season).
// ESPN team rosters have 15-20 players each; "experienceYears" alone is a poor
// proxy for star status (it favors 14-year journeymen over 5-year MVPs). This
// list ensures we generate props for actual marquee players when they appear
// on a team's current roster. Fallback is experience-based for any team not
// listed here.

export const NBA_STARS: Record<string, string[]> = {
  ATL: ["Trae Young", "Jalen Johnson", "Dyson Daniels", "Zaccharie Risacher"],
  BOS: ["Jayson Tatum", "Jaylen Brown", "Derrick White", "Jrue Holiday", "Kristaps Porzingis"],
  BKN: ["Cam Thomas", "Mikal Bridges", "Cameron Johnson", "Day'Ron Sharpe"],
  CHA: ["LaMelo Ball", "Brandon Miller", "Miles Bridges", "Mark Williams"],
  CHI: ["Nikola Vucevic", "Coby White", "Matas Buzelis", "Josh Giddey"],
  CLE: ["Donovan Mitchell", "Darius Garland", "Evan Mobley", "Jarrett Allen", "De'Andre Hunter"],
  DAL: ["Anthony Davis", "Kyrie Irving", "P.J. Washington", "Klay Thompson", "Daniel Gafford"],
  DEN: ["Nikola Jokic", "Jamal Murray", "Michael Porter Jr.", "Aaron Gordon", "Russell Westbrook"],
  DET: ["Cade Cunningham", "Jaden Ivey", "Jalen Duren", "Ausar Thompson", "Tobias Harris"],
  GSW: ["Stephen Curry", "Jimmy Butler", "Draymond Green", "Brandin Podziemski", "Andrew Wiggins"],
  HOU: ["Alperen Sengun", "Jalen Green", "Jabari Smith Jr.", "Amen Thompson", "Fred VanVleet"],
  IND: ["Tyrese Haliburton", "Pascal Siakam", "Aaron Nesmith", "Bennedict Mathurin", "Myles Turner"],
  LAC: ["Kawhi Leonard", "Norman Powell", "Ivica Zubac", "James Harden", "Bogdan Bogdanovic"],
  LAL: ["LeBron James", "Luka Doncic", "Austin Reaves", "Rui Hachimura", "Dalton Knecht"],
  MEM: ["Ja Morant", "Desmond Bane", "Jaren Jackson Jr.", "Santi Aldama", "Zach Edey"],
  MIA: ["Bam Adebayo", "Tyler Herro", "Andrew Wiggins", "Duncan Robinson", "Kel'el Ware"],
  MIL: ["Giannis Antetokounmpo", "Damian Lillard", "Bobby Portis", "Gary Trent Jr.", "Kyle Kuzma"],
  MIN: ["Anthony Edwards", "Julius Randle", "Rudy Gobert", "Jaden McDaniels", "Donte DiVincenzo"],
  NOP: ["Zion Williamson", "Trey Murphy III", "Herbert Jones", "Jordan Poole", "Yves Missi"],
  NYK: ["Jalen Brunson", "Karl-Anthony Towns", "OG Anunoby", "Mikal Bridges", "Josh Hart", "Mitchell Robinson"],
  OKC: ["Shai Gilgeous-Alexander", "Jalen Williams", "Chet Holmgren", "Lu Dort", "Isaiah Hartenstein"],
  ORL: ["Paolo Banchero", "Franz Wagner", "Jalen Suggs", "Anthony Black", "Wendell Carter Jr."],
  PHI: ["Joel Embiid", "Paul George", "Tyrese Maxey", "Andre Drummond", "Kelly Oubre Jr."],
  PHX: ["Devin Booker", "Bradley Beal", "Kevin Durant", "Royce O'Neale", "Grayson Allen"],
  POR: ["Deni Avdija", "Shaedon Sharpe", "Scoot Henderson", "Toumani Camara", "Donovan Clingan"],
  SAC: ["Domantas Sabonis", "DeMar DeRozan", "Zach LaVine", "Malik Monk", "Keegan Murray"],
  SAS: ["Victor Wembanyama", "De'Aaron Fox", "Stephon Castle", "Devin Vassell", "Chris Paul"],
  TOR: ["Scottie Barnes", "Immanuel Quickley", "Brandon Ingram", "RJ Barrett", "Jakob Poeltl"],
  UTA: ["Lauri Markkanen", "Collin Sexton", "Keyonte George", "Walker Kessler", "John Collins"],
  WAS: ["Jordan Poole", "Bilal Coulibaly", "Alex Sarr", "Kyshawn George", "Bub Carrington"],
};

export const MLB_STARS: Record<string, string[]> = {
  ARI: ["Ketel Marte", "Corbin Carroll", "Eugenio Suarez", "Christian Walker", "Zac Gallen"],
  ATL: ["Ronald Acuna Jr.", "Matt Olson", "Austin Riley", "Ozzie Albies", "Spencer Strider", "Chris Sale"],
  BAL: ["Gunnar Henderson", "Adley Rutschman", "Anthony Santander", "Jackson Holliday", "Corbin Burnes"],
  BOS: ["Rafael Devers", "Jarren Duran", "Triston Casas", "Trevor Story", "Garrett Crochet", "Tanner Houck"],
  CHC: ["Pete Crow-Armstrong", "Kyle Tucker", "Ian Happ", "Dansby Swanson", "Justin Steele", "Shota Imanaga"],
  CHW: ["Luis Robert Jr.", "Andrew Vaughn", "Andrew Benintendi", "Garrett Crochet"],
  CIN: ["Elly De La Cruz", "Tyler Stephenson", "Jonathan India", "Spencer Steer", "Hunter Greene"],
  CLE: ["Jose Ramirez", "Steven Kwan", "Josh Naylor", "Andres Gimenez", "Tanner Bibee"],
  COL: ["Ryan McMahon", "Brenton Doyle", "Ezequiel Tovar", "Kris Bryant"],
  DET: ["Riley Greene", "Spencer Torkelson", "Kerry Carpenter", "Tarik Skubal"],
  HOU: ["Jose Altuve", "Yordan Alvarez", "Alex Bregman", "Kyle Tucker", "Framber Valdez", "Justin Verlander"],
  KC: ["Bobby Witt Jr.", "Salvador Perez", "Vinnie Pasquantino", "MJ Melendez", "Cole Ragans"],
  LAA: ["Mike Trout", "Anthony Rendon", "Taylor Ward", "Logan O'Hoppe", "Yusei Kikuchi"],
  LAD: ["Shohei Ohtani", "Mookie Betts", "Freddie Freeman", "Will Smith", "Tyler Glasnow", "Yoshinobu Yamamoto"],
  MIA: ["Jazz Chisholm Jr.", "Jake Burger", "Jesus Sanchez", "Sandy Alcantara"],
  MIL: ["Christian Yelich", "Willy Adames", "Jackson Chourio", "William Contreras", "Freddy Peralta"],
  MIN: ["Carlos Correa", "Byron Buxton", "Royce Lewis", "Jhoan Duran", "Pablo Lopez"],
  NYM: ["Francisco Lindor", "Pete Alonso", "Brandon Nimmo", "Mark Vientos", "Kodai Senga", "Edwin Diaz"],
  NYY: ["Aaron Judge", "Juan Soto", "Giancarlo Stanton", "Anthony Volpe", "Gerrit Cole", "Carlos Rodon"],
  OAK: ["Brent Rooker", "Lawrence Butler", "JJ Bleday"],
  ATH: ["Brent Rooker", "Lawrence Butler", "JJ Bleday", "Tyler Soderstrom"],
  PHI: ["Bryce Harper", "Trea Turner", "Kyle Schwarber", "Nick Castellanos", "Zack Wheeler", "Aaron Nola"],
  PIT: ["Paul Skenes", "Bryan Reynolds", "Oneil Cruz", "Mitch Keller"],
  SD: ["Manny Machado", "Fernando Tatis Jr.", "Xander Bogaerts", "Jackson Merrill", "Yu Darvish", "Dylan Cease"],
  SF: ["Matt Chapman", "Heliot Ramos", "Jung Hoo Lee", "Logan Webb", "Robbie Ray"],
  SEA: ["Julio Rodriguez", "Cal Raleigh", "Logan Gilbert", "George Kirby", "Bryan Woo"],
  STL: ["Nolan Arenado", "Paul Goldschmidt", "Willson Contreras", "Sonny Gray"],
  TB: ["Brandon Lowe", "Yandy Diaz", "Junior Caminero", "Shane McClanahan"],
  TEX: ["Corey Seager", "Marcus Semien", "Adolis Garcia", "Wyatt Langford", "Jacob deGrom", "Nathan Eovaldi"],
  TOR: ["Vladimir Guerrero Jr.", "Bo Bichette", "George Springer", "Daulton Varsho", "Jose Berrios", "Kevin Gausman"],
  WSH: ["CJ Abrams", "James Wood", "Luis Garcia Jr.", "MacKenzie Gore"],
};

export function getStars(sport: string, teamAbbr: string): string[] {
  const map = sport === "NBA" ? NBA_STARS : sport === "MLB" ? MLB_STARS : {};
  return map[teamAbbr] ?? [];
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchesAnyStar(playerName: string, stars: string[]): boolean {
  const norm = normalizeName(playerName);
  return stars.some((s) => normalizeName(s) === norm);
}
