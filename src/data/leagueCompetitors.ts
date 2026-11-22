/**
 * leagueCompetitors.ts
 * The people behind the 15 Championship opponents. In Indigo League City each
 * competitor can be found and talked to: where they come from, how they built
 * their team, a piece of advice, and how they feel about the tournament as it
 * unfolds (before it starts, while they are still in it, after you beat them,
 * after someone else knocked them out, and once a champion is crowned).
 *
 * Keyed by the competitor's name in CHAMPIONSHIP_OPPONENTS, so the profile
 * always matches the trainer the bracket uses.
 */

export interface CompetitorProfile {
  /** Where they come from. */
  home: string;
  /** Short line spoken when you first walk up to them. */
  greeting: string;
  /** Their road to the Plateau, told in a few lines. */
  journey: string[];
  /** What they say about their own team. */
  team: string;
  /** A real tip about how they fight (and how to beat them). */
  advice: string;
  /** What they are doing in the city right now (shown as a subtitle). */
  activity: string;
  /** Status-dependent lines. */
  status: {
    waiting: string; // tournament not started
    rival: string; // they are still in and are your next opponent
    active: string; // still in, not your next opponent
    beatenByYou: string; // you knocked them out
    outByOther: string; // someone else knocked them out
    afterYouWon: string; // you are the champion
  };
}

export const COMPETITOR_PROFILES: Record<string, CompetitorProfile> = {
  'Ace Trainer Jake': {
    home: 'Pallet Town outskirts',
    greeting: 'Hey! You came from Pallet too, right? I recognise that look - nervous and excited at the same time.',
    activity: 'Running laps around the Gateway fountain',
    journey: [
      'I left home the same spring you did. I took the long way, every route twice.',
      'My Pidgey carried my letters home from every city. It is a Pidgeot now and it still does.',
      'I am not the strongest here. But nobody in this city has prepared more than me.',
    ],
    team: 'Pidgeot, Raichu, Gyarados and Alakazam. Something for every matchup - that is the whole idea.',
    advice: 'A balanced team has no glaring weakness, so do not look for one. Look for the Pokemon that is carrying the others, and take it out first.',
    status: {
      waiting: 'The draw puts us together in the Round of 16. First match of the whole Championship. Let us make it a good one.',
      rival: 'It is us next! No holding back - I would hate to win because you went easy.',
      active: 'Still standing! Every round feels like climbing another route.',
      beatenByYou: 'You beat me fair and square. I am cheering for you now - win the whole thing, okay?',
      outByOther: 'Knocked out early... but I am staying to watch every match. I want to learn from all of it.',
      afterYouWon: 'Champion! I knew it the moment we battled. Pallet Town is going to throw you a party.',
    },
  },
  'Pyromaniac Flint': {
    home: 'Cinnabar Island',
    greeting: 'Feel that heat? That is my Magmar warming up. It never really cools down.',
    activity: 'Warming his hands by the Eternal Flame',
    journey: [
      'I grew up on Cinnabar, next to the volcano. Fire was the first thing I ever understood.',
      'I trained on the crater rim where the ground is too hot to stand on. My Charmander did not mind.',
      'Every badge I won, I won by pushing harder than the other trainer was willing to.',
    ],
    team: 'Magmar, Rapidash, Flareon, Charizard. All fire. People call that a weakness. I call it focus.',
    advice: 'Burning Pokemon lose half their physical power. If you rely on hard hitters, bring something that does not care about burns - or heal them fast.',
    status: {
      waiting: 'They have me against Sailor Marina first. Fire against the ocean. The crowd is going to love it.',
      rival: 'So it is you and me. Bring water if you are smart. I will burn through it anyway.',
      active: 'Still burning. Nobody has put this fire out yet.',
      beatenByYou: 'You actually put me out. I have not been beaten like that since I was a kid. Respect.',
      outByOther: 'Out. Somebody brought the right counters. Next year I will be ready for them.',
      afterYouWon: 'The new Champion. Come visit Cinnabar - I will show you the crater where I started.',
    },
  },
  'Sailor Marina': {
    home: 'Vermilion City harbour',
    greeting: 'Ahoy! Smell that? No sea air up here on the Plateau. I miss it already.',
    activity: 'Sketching the lily ponds in the Garden of Legends',
    journey: [
      'I worked the ferries out of Vermilion. Every crossing, I battled whoever was on board.',
      'My Tentacool was caught in a fishing net when I found it. We have been crew ever since.',
      'Water teaches patience. Waves do not hurry and neither do I.',
    ],
    team: 'Poliwrath, Tentacruel, Cloyster and Blastoise. Thick shells and long battles.',
    advice: 'Bulky Pokemon win by outlasting you. Do not trade small hits with them - find a move that breaks their defences and commit to it.',
    status: {
      waiting: 'My first opponent is Flint, the fire trainer from Cinnabar. He thinks the ocean will boil. We will see.',
      rival: 'Next up is you. Steady seas, Trainer. May the better crew win.',
      active: 'Still afloat! One more round, then another. That is how you cross an ocean.',
      beatenByYou: 'You sank my whole fleet. Well sailed, Captain.',
      outByOther: 'We ran aground this year. The sea always gives you another tide.',
      afterYouWon: 'Champion! If you ever want to sail Kanto, my ferry is yours, free of charge.',
    },
  },
  'Ninja Shadow Raven': {
    home: 'Fuchsia City',
    greeting: '... You saw me? Most people walk straight past.',
    activity: 'Watching the crowd from the shade of the cypress trees',
    journey: [
      'I trained in Fuchsia under the old ninja masters. Silence, patience, poison.',
      'My Gastly was the only Pokemon that would follow me into the dark.',
      'I do not need to hit hardest. I only need my opponent to be slower than me.',
    ],
    team: 'Arbok, Venomoth, Scyther and Gengar. Speed and status. Your Pokemon will be asleep or poisoned before they move.',
    advice: 'Carry Full Heals. I am not joking. A sleeping Pokemon loses the whole battle without doing anything.',
    status: {
      waiting: 'Black Belt Daisuke in the first round. All strength, no subtlety. That suits me perfectly.',
      rival: 'We meet next. You will not see my plan coming. I suggest you bring antidotes.',
      active: 'Still in the shadows of the bracket. Waiting.',
      beatenByYou: 'You saw through every trick. No one has done that since my master. ...Thank you.',
      outByOther: 'Defeated. I will return to Fuchsia and train in silence.',
      afterYouWon: 'The Champion. My master would have liked you.',
    },
  },
  'Black Belt Daisuke': {
    home: 'Saffron City Dojo',
    greeting: 'OSU! Forgive me - two hundred punches every hour, even during a tournament!',
    activity: 'Training at the outdoor dojo yard',
    journey: [
      'I lost to the Saffron Gym once and the Karate Master took me in. Ten years of training since then.',
      'My Machop could barely lift a stone when we started. Now it lifts boulders for fun.',
      'I have no tricks. Just discipline. Every day, the same training, a little harder.',
    ],
    team: 'Primeape, Hitmonlee, Hitmonchan and Machamp. Pure fighting spirit.',
    advice: 'Fighting Pokemon hit very hard but they hate Psychic and Flying types. A fast Psychic will end my team quickly. I train every day to stop that happening!',
    status: {
      waiting: 'My first opponent is the ninja from Fuchsia. Hard to punch what you cannot see. I will learn.',
      rival: 'You are my next opponent! I bow to you now, and I will bow again after the match - win or lose.',
      active: 'Victory! The training continues. Tomorrow, harder!',
      beatenByYou: 'A clean defeat. I will train ten times harder. Thank you for the lesson!',
      outByOther: 'Out of the tournament, but not out of training. Two hundred more punches!',
      afterYouWon: 'OSU, Champion! You are welcome at the Saffron Dojo any day.',
    },
  },
  'Scientist Edison': {
    home: 'Silph Co. research labs, Saffron',
    greeting: 'Fascinating - your Pokemon\'s heart rate rose eleven percent when you walked up. Excitement or nerves?',
    activity: 'Taking readings of the stadium floodlights',
    journey: [
      'I build battle simulators at Silph Co. One day I wondered whether the numbers would hold up in a real stadium.',
      'My Voltorb rolled into my lab during a power cut. It has been my research partner ever since.',
      'I have simulated this tournament four thousand times. I win thirty-one percent of them.',
    ],
    team: 'Electrode, Magneton, Electabuzz and Jolteon. Very fast, very precise.',
    advice: 'Electric types fall to Ground types, but my Magneton is part Steel and my Electrode moves first. Bring something bulky that can take one hit and answer back.',
    status: {
      waiting: 'Round one: Botanist Flora. My models give me a slight edge. Her Exeggutor is the variable.',
      rival: 'We are next. I have updated my model for you. Please be predictable.',
      active: 'Still in. The data is behaving exactly as expected. Mostly.',
      beatenByYou: 'You broke my model. That is the most exciting thing that has happened to me in years.',
      outByOther: 'Eliminated. Every loss is data. I have a great deal of data now.',
      afterYouWon: 'The probability of this was low. You beat it. I will be studying your matches for months.',
    },
  },
  'Botanist Flora': {
    home: 'Celadon City gardens',
    greeting: 'Oh! Mind the flowerbed - I planted those violets this morning. The League let me tend the gardens while I wait.',
    activity: 'Tending the Garden of Legends',
    journey: [
      'I studied plants under Celadon\'s Gym Leader before I ever battled.',
      'My Bulbasaur was born in a greenhouse. It thinks every sunbeam is a gift.',
      'Grass Pokemon are patient. They wait, they spread, and then the whole field is theirs.',
    ],
    team: 'Parasect, Victreebel, Exeggutor and Venusaur. Spores, powders and a lot of patience.',
    advice: 'Sleep Powder and Stun Spore will decide most of my battles. A Fire or Flying type that strikes first gives me nothing to work with.',
    status: {
      waiting: 'Scientist Edison is my first match. Machines against nature. I like my chances.',
      rival: 'Next it is you. I will try to be gentle. My Venusaur will not.',
      active: 'Still blooming! One more round.',
      beatenByYou: 'You pulled every one of my weeds. Well done. Come see the gardens anyway?',
      outByOther: 'Out of the tournament. I do not mind - the gardens here need me more.',
      afterYouWon: 'A new Champion! I am planting a bed of red flowers in your honour.',
    },
  },
  'Psychic Soren': {
    home: 'Saffron City',
    greeting: 'I knew you would come over here. I did not know you would be smiling. That part surprised me.',
    activity: 'Meditating at the Shrine of Reflection',
    journey: [
      'I could bend spoons before I could read. Saffron\'s Gym taught me to aim it.',
      'My Abra teleported into my bedroom when I was six. It never left.',
      'I see a little of the future in every battle. It is never enough.',
    ],
    team: 'Hypno, Kadabra, Jynx and Alakazam. They hit with the mind, not the body.',
    advice: 'Psychic Pokemon are fragile physically. Hit them hard with physical attacks, or bring a Ghost or Bug type and watch them struggle.',
    status: {
      waiting: 'Mountaineer Boulder in the first round. I already know how it starts. Not how it ends.',
      rival: 'We battle next. I have seen it. I still do not know who wins. That is exciting.',
      active: 'Still here. The future keeps changing.',
      beatenByYou: 'I did not foresee that. I am glad. Some things should stay surprising.',
      outByOther: 'Eliminated. I saw it coming, which made it no easier.',
      afterYouWon: 'I saw a champion in your future the day you arrived. I just did not say so.',
    },
  },
  'Mountaineer Boulder': {
    home: 'Mt. Moon',
    greeting: 'Ha! The air up here is thin, but it is nothing next to the summit of Mt. Moon.',
    activity: 'Climbing the stadium steps for practice',
    journey: [
      'I have climbed every mountain in Kanto. Twice. Once with my eyes closed.',
      'My Geodude fell on my head in a Mt. Moon cave. Best thing that ever happened to me.',
      'Mountains taught me to keep going when it is hard. That is all battling is.',
    ],
    team: 'Sandslash, Marowak, Golem and Rhydon. Solid rock. Nothing gets through.',
    advice: 'My team crumbles to Water and Grass moves. If you bring a strong one, you will have an easy day. If you do not... good luck getting through rock.',
    status: {
      waiting: 'Round one is against Psychic Soren. He says he knows how it ends. I say mountains do not care.',
      rival: 'You are my next climb! Let us see who reaches the top.',
      active: 'Another round, another peak.',
      beatenByYou: 'You moved a mountain. I am impressed.',
      outByOther: 'Out! Back to the mountains to train. They never lose.',
      afterYouWon: 'Champion! Join me on Mt. Moon some time - I know the best view in Kanto.',
    },
  },
  'Veteran Marcus': {
    home: 'Lavender Town',
    greeting: 'Sit down a moment, young one. I have entered this Championship six times. I am in no hurry.',
    activity: 'Resting on a bench by the Hall of Fame',
    journey: [
      'I first came here forty years ago. I reached the final twice and lost both times.',
      'My Snorlax has been with me since before you were born. It sleeps through every speech.',
      'I do not need to win any more. I come to see who the next generation will be.',
    ],
    team: 'Snorlax, Lapras, Kangaskhan and Dragonite. Old friends, all of them. Very strong old friends.',
    advice: 'Do not panic when the battle turns against you. The trainer who stays calm makes the better choice in the last turn. That is the whole secret.',
    status: {
      waiting: 'They put me against young Leo in the first round. He reminds me of myself. Too fast, too sure.',
      rival: 'So it is you next. Good. Show this old man what you have learned.',
      active: 'Still in at my age! My Snorlax is very pleased with itself.',
      beatenByYou: 'Well done. That is exactly the kind of trainer I came here hoping to meet.',
      outByOther: 'Out again. Seven times now. I will watch the rest with a cup of tea.',
      afterYouWon: 'Champion. I have waited forty years to shake a champion\'s hand who earned it like you did.',
    },
  },
  'Young Prodigy Leo': {
    home: 'Viridian City',
    greeting: 'Are you a competitor? I am the youngest one here! Eleven! Everyone keeps telling me that.',
    activity: 'Racing his Dodrio up and down the Boulevard',
    journey: [
      'I got my first badge three months ago. Then the next one. Then all of them!',
      'My Diglett dug under my school fence and I followed it. That was my first adventure.',
      'Everyone says I am too young. I just want to battle the best trainers in Kanto.',
    ],
    team: 'Dodrio, Dugtrio, Jolteon and Gengar. We are the fastest team in the tournament, I checked!',
    advice: 'If you are faster you hit first, and if you hit first you win! ...Okay, that does not always work. But it is fun.',
    status: {
      waiting: 'My first battle is against Veteran Marcus. He has been here six times. I have been here zero times!',
      rival: 'You are next! I am going to be so fast you will not even see us!',
      active: 'I won! I actually won a round! Did you see?',
      beatenByYou: 'Aww. You were really good though. Can I watch your next battle?',
      outByOther: 'I lost... but I am only eleven. I will be back every year until I win!',
      afterYouWon: 'You are the Champion! I want to be just like you!',
    },
  },
  'Dragon Tamer Drake': {
    home: 'A dragon clan in the mountains far beyond Kanto',
    greeting: 'You walk like a trainer who has faced something dangerous. Good. So have I.',
    activity: 'Standing by the statues in the Garden of Legends',
    journey: [
      'My clan sends one trainer to Kanto every generation. This time it is me.',
      'My Dratini hatched from an egg my grandmother kept for thirty years.',
      'Dragons do not obey. They agree to follow. Earning that took me ten years.',
    ],
    team: 'Aerodactyl, Gyarados, Kingler and Dragonite. Ancient power and the deep sea.',
    advice: 'Ice moves are the dragon\'s bane. One well-timed Ice Beam can undo my whole plan. I tell you this because I respect you.',
    status: {
      waiting: 'Lass Emily in the first round. Do not let the smile fool you - she is dangerous.',
      rival: 'We are next. Prepare yourself as if you were facing a dragon. Because you are.',
      active: 'The dragon still flies.',
      beatenByYou: 'You have tamed my dragons. My clan will hear your name.',
      outByOther: 'Defeated. My clan will understand. Dragons fall and rise again.',
      afterYouWon: 'Champion. When you are ready, come and meet my clan. They will want to battle you.',
    },
  },
  'Lass Emily': {
    home: 'Cerulean City',
    greeting: 'Hi hi! Do you like my Clefable? Everyone says it looks harmless. Everyone is wrong!',
    activity: 'Feeding the fish at the Gateway fountain',
    journey: [
      'I used to watch battles at the Cerulean Gym every weekend. Then I decided to stop watching.',
      'My Clefairy followed me home from Mt. Moon after a meteor shower. Best night ever.',
      'People underestimate cute Pokemon. That is my favourite thing about them.',
    ],
    team: 'Clefable, Wigglytuff, Ninetales and Vaporeon. Cute and deadly - that is my motto!',
    advice: 'My Wigglytuff can put your whole team to sleep with Sing. If you see it, switch to something that does not mind, or end it quickly!',
    status: {
      waiting: 'My first match is the dragon man, Drake. Big scary dragons. My Clefable is not scared!',
      rival: 'We are next! Promise you will not be mean to my Clefable? ...I will not be nice to yours!',
      active: 'Still in! See? Cute AND deadly.',
      beatenByYou: 'Hmph! You were not even a little bit charmed. Fine. You win. This time.',
      outByOther: 'Out already... but my Clefable still had fun, so it is okay.',
      afterYouWon: 'Champion! Can I get a picture with you and your partner? Please please please?',
    },
  },
  'Bird Keeper Zephyr': {
    home: 'The cliffs above Route 13',
    greeting: 'Look up! See that speck? That is my Fearow. It has been circling the stadium since dawn.',
    activity: 'Watching the sky from the north promenade',
    journey: [
      'I lived alone on the sea cliffs with the birds for three years. I learned their language before I learned to battle.',
      'My Spearow stole my lunch every day for a week. On the eighth day it brought a friend. I gave up and joined them.',
      'In the air there are no walls. That is the freedom I battle for.',
    ],
    team: 'Fearow, Golbat, Pidgeot and Aerodactyl. Nothing on the ground can touch us.',
    advice: 'Flying types fear Electric and Rock moves. Keep one ready and my flock will not stay in the sky for long.',
    status: {
      waiting: 'Rival Blue in the first round. The favourite. Good - I want to beat the best.',
      rival: 'You and me next. I will be looking down on you the whole battle. From the sky, I mean.',
      active: 'Still flying!',
      beatenByYou: 'You clipped our wings. Well battled. The sky will still be there tomorrow.',
      outByOther: 'Grounded. Back to the cliffs to train with the flock.',
      afterYouWon: 'Champion! My birds will carry the news all over Kanto by tonight.',
    },
  },
  'Rival Blue': {
    home: 'Pallet Town',
    greeting: 'Took you long enough. I have been here two days already, getting a feel for the stadium.',
    activity: 'Waiting by the stadium entrance',
    journey: [
      'You know my story - we started on the same day, in the same lab.',
      'I beat every Gym first. I made sure you knew it, too.',
      'Every time I looked back, you were right behind me. I am done looking back. I want to face you in the final.',
    ],
    team: 'Pidgeot, Alakazam, Rhydon, Exeggutor, Gyarados and Charizard. Six Pokemon, no weaknesses. Built to beat you.',
    advice: 'Advice? From me? ...Fine. Do not switch out too much. You always do that when you get nervous. I have noticed.',
    status: {
      waiting: 'They put us on opposite sides of the bracket. Good. Win your matches. I will see you in the final.',
      rival: 'There you are. I knew it would come down to us. Let us find out who is the real Champion.',
      active: 'Of course I am still in. Did you doubt it? Just make sure you are too.',
      beatenByYou: '...You beat me. Again. Do not let it go to your head. I will be back, and next time I win.',
      outByOther: 'I lost. To someone who is not you. That is almost worse. Win it for Pallet Town.',
      afterYouWon: 'Champion, huh. Fine. You earned it. Just do not forget who pushed you the whole way.',
    },
  },
};
