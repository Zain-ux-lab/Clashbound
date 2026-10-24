// Character rules come from the same roster as battles.
(async function(){
 try{
  const response=await fetch('/api/roster');if(!response.ok)return;
  for(const character of await response.json()){
   const article=document.getElementById(character.id),copy=article?.querySelector('.catalog-copy');if(!copy)continue;
   const category=copy.querySelector('.character-category');if(category)category.textContent=character.type;
   const p=document.createElement('p'),strong=document.createElement('strong');
   strong.textContent=character.passive.name+' · ';p.append(strong,document.createTextNode(character.passive.description));
   const move=document.createElement('p');move.textContent=character.moves[3].name+' · '+character.moves[3].description;
   copy.append(p,move);
  }
 }catch{/* Static character art and navigation stay available offline. */}
})();
