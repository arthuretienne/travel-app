# Plan d'Action Immédiat - Migration Air Scraper

## ✅ Ce qui est fait

1. ✅ POC test script créé
2. ✅ Documentation workflow complète
3. ✅ Analyse coûts et architecture
4. ✅ Commit & push sur GitHub

---

## 🎯 Prochaines Étapes (Toi)

### **Étape 1: Subscribe Air Scraper API (5 minutes)**

1. Va sur RapidAPI: https://rapidapi.com/3b-data-3b-data-default/api/sky-scrapper

2. **Pour tester (gratuit):**
   - Click "Subscribe to Test"
   - Select "Basic" plan (FREE)
   - 20 requests/month (parfait pour POC)

3. **Copie ta clé API:**
   - Va dans "Endpoints" tab
   - Copie "X-RapidAPI-Key" en haut à droite

4. **Ajoute au .env:**
   ```bash
   # backend/.env
   AIR_SCRAPER_API_KEY=ton_api_key_ici
   ```

---

### **Étape 2: Run POC Test (2 minutes)**

```bash
cd backend
node src/scripts/testAirScraper.js
```

**Outputs à vérifier:**

✅ **SUCCESS si:**
- ✅ Response time < 5 secondes
- ✅ Données complètes (prix, horaires, compagnies)
- ✅ Au moins 3 vols retournés
- ✅ Prix cohérents (compare avec Skyscanner.fr)

❌ **ÉCHEC si:**
- ❌ Errors / timeouts
- ❌ Données incomplètes
- ❌ Prix très différents de Skyscanner

---

### **Étape 3: Valide les Données (10 minutes)**

Pour chaque test result, vérifie manuellement sur Skyscanner:

**Test 1: Paris → Barcelona (15 juin)**
1. Va sur https://www.skyscanner.fr
2. Cherche Paris → Barcelona, 15 juin 2025
3. Compare les 3 premiers résultats avec le script
4. Prix match? Horaires match? ✅/❌

**Test 2: Price Calendar**
1. Sur Skyscanner, click "Whole month" view
2. Compare le prix du 12 juin avec le script
3. Prix match? ✅/❌

**Test 3: Destinations Everywhere**
1. Sur Skyscanner, cherche "Paris → Everywhere"
2. Filtre budget max €200
3. Porto, Prague, Budapest dans les résultats? ✅/❌

---

### **Étape 4: Décision Go/No-Go**

**✅ SI TOUT EST OK (>90% match):**
- Subscribe to Pro plan ($8.99/month)
- Dis-moi "GO" et je commence l'implémentation

**❌ SI PROBLÈMES:**
- Envoie-moi les logs du script
- On debug ensemble
- On cherche alternative si besoin

---

## 🚀 Après Validation (Moi)

Dès que tu me dis "GO", je lance:

### **Week 1: Backend Services**
1. Create `airScraperService.js`
   - searchFlights with caching
   - getPriceCalendar
   - searchFlightEverywhere
   - Error handling & fallbacks

2. Create `flixbusService.js`
   - searchBuses
   - Integration with ecology preferences

3. Create `cache.js` utility
   - In-memory caching
   - Configurable TTL
   - Cache invalidation

### **Week 2: Workflow Refactor**
4. Update `recommendationService.js`
   - Scenario A: No destination (explore mode)
   - Scenario C: Fixed destination (detailed plan)
   - Transport decision logic
   - Integration avec onboarding data

5. Update `itineraryService.js`
   - Add real flight times to plan
   - Add airport transfers
   - Add transport alternatives

6. Update routes & endpoints

### **Week 3: Frontend Integration**
7. Update Results page
   - Show real flight times
   - Show transport alternatives
   - Show CO2 comparison

8. Update TripDetail page
   - Detailed timeline with flight times
   - Airport transfer instructions
   - Train/bus alternatives if relevant

### **Week 4: Deploy & Monitor**
9. Deploy to Railway
10. Monitor API usage & costs
11. A/B test vs old workflow
12. Remove Amadeus dependency

---

## 📊 Success Checklist

### POC Phase
- [ ] Air Scraper API key obtained
- [ ] Test script runs successfully
- [ ] All 3 scenarios work
- [ ] Prices match Skyscanner ±5%
- [ ] Response times < 5s

### Implementation Phase
- [ ] airScraperService.js created & tested
- [ ] flixbusService.js created & tested
- [ ] Caching implemented
- [ ] Recommendation workflow refactored
- [ ] Frontend updated
- [ ] E2E tests passing

### Production Phase
- [ ] Deployed to Railway
- [ ] Monitoring in place
- [ ] API costs < $10/month
- [ ] User satisfaction improved
- [ ] "No flights found" errors reduced
- [ ] Amadeus removed

---

## 💡 Quick Wins à Implémenter Maintenant

Pendant que tu testes le POC, voici ce que je peux faire en parallèle:

### 1. **Créer la structure de base airScraperService.js**
- Skeleton avec toutes les fonctions
- Error handling
- Logging

### 2. **Créer cache.js utility**
- Simple in-memory cache
- TTL management
- Ready to use

### 3. **Documentation API endpoints**
- Spec pour nouveaux endpoints
- Request/response examples

**Veux-tu que je commence ces quick wins pendant que tu testes?**

---

## 🆘 Support

**Si problèmes avec POC:**
1. Envoie-moi screenshot des erreurs
2. Envoie-moi les logs complets
3. On debug ensemble

**Questions:**
- API key pas trouvée? → Check RapidAPI dashboard
- Script crash? → Vérifie .env file
- Pas de résultats? → Vérifie dates (futures only)
- Prices weird? → Compare avec Skyscanner website

---

## 📞 Contact

Une fois le POC validé, dis-moi:
- ✅ "GO - Tout fonctionne!"
- ⚠️ "WAIT - Problème avec [X]"
- ❌ "NO-GO - [Raison]"

Et je commence l'implémentation immédiatement! 🚀

---

## 🎯 Timeline Estimée

| Phase | Durée | Quoi |
|-------|-------|------|
| POC Test (Toi) | 30 min | Subscribe + Run script + Validate |
| Decision | 1h | Analyse results, décision GO/NO-GO |
| Implementation (Moi) | 2 weeks | Services + Workflow + Frontend |
| Testing | 3 days | E2E tests, fixes |
| Deploy | 1 day | Production deployment |
| Monitor | 1 week | Track metrics, optimize |

**Total: ~3 weeks from POC to production**

---

## 💰 ROI

**Investissement:**
- Ton temps: 30 min setup + 1h validation
- Mon temps: ~2 weeks dev
- Coût mensuel: $8.99 (vs $50)

**Retour:**
- 💰 Savings: $492/year (82% reduction)
- 📊 Better data: Real-time prices, flight times
- 😊 Better UX: Detailed plans, fewer errors
- 🚀 Faster: Skyscanner = très rapide

**Break-even:** Immédiat! Économies dès le premier mois.

---

**Prêt? GO! 🚀**
