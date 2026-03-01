/**
 * Cities, towns, and major market centres keyed by country name.
 * Covers all countries in the COUNTRIES list.
 * African entries are especially detailed — including LGAs, market towns, and district centres.
 */

const CITIES_BY_COUNTRY = {
  Nigeria: [
    // Lagos State
    "Lagos","Ikeja","Victoria Island","Lekki","Ikorodu","Badagry","Epe","Agege","Alimosho",
    "Oshodi","Mushin","Surulere","Apapa","Yaba","Isale Eko","Gbagada","Magodo","Ojodu","Ojota",
    "Sangotedo","Ajah","Festac Town","Ajegunle","Ijora","Tin Can Island","Ojo","Orile","Ibeju-Lekki",
    // Abuja FCT
    "Abuja","Garki","Wuse","Maitama","Asokoro","Gwarinpa","Kubwa","Karu","Lugbe","Gwagwalada",
    "Kuje","Bwari","Abaji","Nyanya","Utako","Jabi","Lokogoma","Durumi","Apo","Gudu",
    // Kano State
    "Kano","Fagge","Nasarawa","Dala","Gwale","Tarauni","Kumbotso","Ungogo","Zaria Road","Wudil",
    "Dawakin Kudu","Gwarzo","Kiru","Bichi","Shanono",
    // Rivers State
    "Port Harcourt","Obio-Akpor","Oyigbo","Eleme","Bonny","Degema","Ahoada","Okrika","Rumuola",
    "Rumuosi","GRA Phase 1","GRA Phase 2","Trans-Amadi","Aba Road","Rumuigbo",
    // Oyo State
    "Ibadan","Ogbomosho","Oyo","Iseyin","Saki","Eruwa","Igbo-Ora","Ara","Lalupon","Akinyele",
    "Iwo","Moniya","Apata","Challenge","Bodija","UI","Dugbe",
    // Anambra State
    "Onitsha","Awka","Nnewi","Ekwulobia","Aguata","Ogidi","Nkpor","Obosi","Utuh","Amorka",
    "Agulu","Abakaliki Road","Kwata","Woliwo","Fegge","Bridge Head Market",
    // Enugu State
    "Enugu","Nsukka","Agbani","Oji River","Udi","Awgu","Coal Camp","Independence Layout",
    "New Haven","Trans-Ekulu","Abakpa","Emene","Artisan","Ogui",
    // Imo State
    "Owerri","Orlu","Okigwe","Oguta","Ngor Okpala","Oru East","Mbaitoli","Ihiala","Ikeduru",
    "Àhiàzù Mbaise","Uratta","New Owerri","World Bank","Ikenegbu",
    // Delta State
    "Warri","Asaba","Sapele","Ughelli","Agbor","Abraka","Burutu","Isoko","Patani","Bomadi",
    "Kokori","Effurun","Jesse","Ozoro","Kwale",
    // Edo State
    "Benin City","Auchi","Ekpoma","Uromi","Igueben","Sabongida-Ora","Ihiala","Ubiaja",
    "Aduwawa","Oregbeni","Uselu","GRA Benin","Ikpoba Hill",
    // Kaduna State
    "Kaduna","Kafanchan","Zaria","Gboko","Samaru","Kakuri","Barnawa","Rigasa","Tudun Wada",
    "Kawo","Malali","Kudenda",
    // Kogi State
    "Lokoja","Okene","Kabba","Idah","Ankpa","Ogaminana","Ajaokuta",
    // Cross River State
    "Calabar","Ogoja","Ikom","Obudu","Bakassi","Ugep","Obubra",
    // Akwa Ibom State
    "Uyo","Eket","Ikot Ekpene","Oron","Abak","Ikot Abasi","Ikot Ede Obong",
    // Benue State
    "Makurdi","Gboko","Otukpo","Katsina-Ala","Vandeikya","Adikpo","Aliade",
    // Plateau State
    "Jos","Bukuru","Barkin Ladi","Pankshin","Shendam","Bokkos","Langtang",
    // Niger State
    "Minna","Bida","Kontagora","Suleja","New Bussa","Lapai","Agaie",
    // Kwara State
    "Ilorin","Offa","Patigi","Omu-Aran","Lafiagi","Ajase-Ipo","Kaiama",
    // Ogun State
    "Abeokuta","Sagamu","Ijebu Ode","Ilaro","Ota","Ifo","Ewekoro","Ijebu Igbo",
    // Ondo State
    "Akure","Ondo","Owo","Ikare","Okitipupa","Ore","Ifon","Idanre",
    // Ekiti State
    "Ado-Ekiti","Ikole Ekiti","Ijero Ekiti","Omuo Ekiti","Oye Ekiti","Ilawe Ekiti",
    // Osun State
    "Osogbo","Ile-Ife","Ilesa","Ede","Iwo","Apomu","Ikire","Ejigbo",
    // Bauchi State
    "Bauchi","Azare","Misau","Jama'are","Katagum","Itas-Gadau",
    // Gombe State
    "Gombe","Kumo","Kaltungo","Billiri","Nafada",
    // Yobe State
    "Damaturu","Potiskum","Gashua","Nguru","Geidam",
    // Borno State
    "Maiduguri","Bama","Gwoza","Kukawa","Monguno","Biu","Konduga",
    // Adamawa State
    "Yola","Mubi","Numan","Ganye","Michika","Madagali",
    // Taraba State
    "Jalingo","Wukari","Bali","Gembu","Takum","Zing",
    // Nasarawa State
    "Lafia","Nasarawa","Keffi","Akwanga","Doma","Obi",
    // Sokoto State
    "Sokoto","Bodinga","Dange-Shuni","Tambuwal","Yabo","Goronyo",
    // Zamfara State
    "Gusau","Kaura Namoda","Anka","Talata Mafara","Zurmi",
    // Kebbi State
    "Birnin Kebbi","Argungu","Yauri","Zuru","Kamba",
    // Jigawa State
    "Dutse","Hadejia","Gumel","Kazaure","Ringim","Guri",
    // Katsina State
    "Katsina","Daura","Funtua","Malumfashi","Kankia","Mani",
    // Abia State
    "Umuahia","Aba","Ohafia","Arochukwu","Isuikwuato",
    // Bayelsa State
    "Yenagoa","Brass","Ogbia","Ekeremor","Sagbama",
    // Ebonyi State
    "Abakaliki","Afikpo","Onueke","Ivo","Ohaukwu",
    // Zamfara
    "Gusau","Kaura Namoda",
    // Major Markets
    "Alaba International Market","Computer Village Ikeja","Balogun Market","Oshodi Market",
    "Ariaria Market Aba","Onitsha Main Market","Idumota Market","Tejuosho Market",
    "Wuse Market Abuja","UTC Market","Bodija Market Ibadan","Gambari Market",
  ],

  Ghana: [
    // Greater Accra
    "Accra","Tema","Madina","Adabraka","Osu","Labone","Dzorwulu","Cantonments","Airport Residential",
    "Ayawaso","Nungua","Teshie","Ashaiman","Dome","Achimota","Lapaz","Dansoman","Mamprobi",
    "Chorkor","Abossey Okai","Kaneshie","Circle","Adenta","Haatso","Amasaman",
    // Ashanti Region
    "Kumasi","Obuasi","Ejisu","Mampong","Konongo","Agona","Bekwai","Juaben","Offinso",
    "Asante Mampong","Kenyasi","Nkawie","Effiduase","Asokwa","Bantama","Suame","Nhyiaeso",
    // Western Region
    "Takoradi","Sekondi","Axim","Tarkwa","Bogoso","Prestea","Agona Nkwanta","Dixcove","Essiama",
    // Central Region
    "Cape Coast","Kasoa","Winneba","Saltpond","Mankessim","Agona Swedru","Assin Fosu","Dunkwa",
    // Eastern Region
    "Koforidua","Nkawkaw","Suhum","Kpong","Akim Oda","Akim Tafo","Nsawam","Sefwi Wiawso",
    // Brong-Ahafo / Bono
    "Sunyani","Berekum","Techiman","Wenchi","Kintampo","Dormaa Ahenkro","Atebubu","Nkoranza",
    // Northern Region
    "Tamale","Sagnarigu","Savelugu","Yendi","Daboya","Tolon","Kumbungu",
    // Upper East
    "Bolgatanga","Bawku","Navrongo","Paga","Zebilla","Bongo",
    // Upper West
    "Wa","Lawra","Jirapa","Nandom","Tumu",
    // Volta Region
    "Ho","Hohoe","Keta","Aflao","Kpando","Jasikan",
    // Oti Region
    "Dambai","Nkwanta","Kadjebi",
    // Major Markets
    "Kejetia Market Kumasi","Makola Market Accra","Tema Main Market","Kaneshie Market",
  ],

  Kenya: [
    // Nairobi
    "Nairobi","Westlands","Karen","Kilimani","Lavington","Parklands","South B","South C",
    "Eastleigh","Umoja","Kayole","Githurai","Kasarani","Ruaka","Kiambu Road","Kileleshwa",
    "Lang'ata","Embakasi","Donholm","Buruburu","Ziwani","River Road","CBD","Hurlingham","Kileleshwa",
    // Mombasa
    "Mombasa","Bamburi","Nyali","Kisauni","Likoni","Changamwe","Mtwapa","Malindi","Kilifi","Watamu",
    // Kisumu
    "Kisumu","Kondele","Mamboleo","Nyamasaria","Ahero","Maseno","Muhoroni",
    // Nakuru
    "Nakuru","Naivasha","Gilgil","Molo","Njoro","Rongai","Eldama Ravine",
    // Eldoret
    "Eldoret","Huruma","Pioneer","Langas","Kapsabet","Nandi Hills","Moiben",
    // Other major towns
    "Thika","Ruiru","Athi River","Kitui","Machakos","Meru","Embu","Nyeri","Murang'a","Kerugoya",
    "Kakamega","Bungoma","Webuye","Mumias","Kericho","Bomet","Sotik","Nyamira","Kisii",
    "Migori","Homa Bay","Siaya","Busia","Malaba","Moyale","Marsabit","Isiolo","Garissa",
    "Wajir","Mandera","Lodwar","Kitale","Kabarnet","Kajiado","Ngong","Rongai","Limuru","Tigoni",
    "Nanyuki","Nyahururu","Karatina","Kerugoya","Sagana","Mwea",
    // Markets
    "Gikomba Market","Toi Market","Eastleigh Mall","Nakuru Town Market","Kisumu Kibuye Market",
  ],

  "South Africa": [
    // Gauteng
    "Johannesburg","Pretoria","Midrand","Centurion","Soweto","Alexandra","Sandton","Randburg",
    "Roodepoort","Germiston","Boksburg","Benoni","Kempton Park","Edenvale","Alberton","Springs",
    "Brakpan","Krugersdorp","Tembisa","Diepsloot","Ivory Park","Fourways","Rosebank","Melville",
    "Braamfontein","Hillbrow","Yeoville","Sunnyside","Hatfield","Arcadia","Menlyn","Mabopane",
    "Atteridgeville","Mamelodi","Ga-Rankuwa","Temba","Hammanskraal",
    // Western Cape
    "Cape Town","Bellville","Mitchells Plain","Khayelitsha","Gugulethu","Langa","Nyanga","Delft",
    "Kuils River","Strand","Somerset West","Stellenbosch","Paarl","Wellington","Worcester",
    "Franschhoek","Hermanus","George","Knysna","Mossel Bay","Oudtshoorn","Beaufort West",
    // KwaZulu-Natal
    "Durban","Pietermaritzburg","Richards Bay","Newcastle","Empangeni","Ladysmith","Vryheid",
    "Umlazi","KwaMashu","Inanda","Ntuzuma","Chatsworth","Phoenix","Tongaat",
    "Pinetown","Westville","Hillcrest","Ballito","Stanger","Port Shepstone",
    // Eastern Cape
    "East London","Port Elizabeth (Gqeberha)","Uitenhage","Grahamstown","King William's Town",
    "Queenstown","Mthatha","Butterworth","Komani","Mdantsane","Zwelitsha",
    // Free State
    "Bloemfontein","Welkom","Phuthaditjhaba","Botshabelo","Sasolburg","Kroonstad","Parys",
    // Mpumalanga
    "Nelspruit","Witbank","Middelburg","Secunda","Standerton","Piet Retief","Lydenburg","Barberton",
    // Limpopo
    "Polokwane","Tzaneen","Mokopane","Lephalale","Louis Trichardt","Bela-Bela","Phalaborwa",
    "Thohoyandou","Giyani","Musina",
    // North West
    "Mahikeng","Rustenburg","Klerksdorp","Potchefstroom","Brits","Vryburg","Schweizer-Reneke",
    // Northern Cape
    "Kimberley","Upington","Springbok","Kuruman","De Aar","Calvinia",
  ],

  Tanzania: [
    "Dar es Salaam","Mwanza","Arusha","Dodoma","Mbeya","Morogoro","Tanga","Zanzibar","Pemba",
    "Kigoma","Tabora","Iringa","Musoma","Shinyanga","Bukoba","Moshi","Lindi","Mtwara","Sumbawanga",
    "Mpanda","Singida","Babati","Same","Korogwe","Tunduru","Songea","Njombe","Makambako","Mbinga",
    "Geita","Kahama","Maswa","Bariadi","Kibaha","Bagamoyo","Kilwa Masoko","Newala",
    "Karatu","Monduli","Kondoa","Kilosa","Mikumi","Ulanga","Malinyi",
    "Kariakoo Market","Manzese","Magomeni","Kinondoni","Ilala","Temeke","Ubungo","Kigamboni",
  ],

  Uganda: [
    "Kampala","Entebbe","Jinja","Mbarara","Gulu","Mbale","Lira","Arua","Fort Portal","Masaka",
    "Soroti","Kabale","Hoima","Moroto","Tororo","Busia","Iganga","Mukono","Wakiso","Kasese",
    "Kasubi","Kireka","Namuwongo","Kalerwe","Kawempe","Rubaga","Makindye","Nakawa","Ntinda",
    "Kira","Nansana","Gayaza","Lugazi","Namasuba","Kigo","Bweyogerere","Seeta","Njeru",
    "Owino Market Kampala","Nakasero Market","Kalerwe Market","Nakawa Market","Fair Ground",
  ],

  Ethiopia: [
    "Addis Ababa","Dire Dawa","Mekelle","Gondar","Bahir Dar","Adama (Nazret)","Hawassa","Jimma",
    "Dessie","Jijiga","Shashamane","Bishoftu","Arba Minch","Hosaena","Wolkite","Debre Birhan",
    "Debre Markos","Debre Tabor","Shire","Axum","Lalibela","Harar","Tigray","Awash",
    "Wolaita Sodo","Nekemte","Gambela","Assosa","Semera","Logia",
    "Merkato Addis Ababa","Piazza","Bole","Lideta","Kolfe","Gulele","Yeka","Kirkos","Nifas Silk",
  ],

  Rwanda: [
    "Kigali","Butare (Huye)","Gitarama (Muhanga)","Ruhengeri (Musanze)","Gisenyi (Rubavu)",
    "Byumba (Gicumbi)","Cyangugu (Rusizi)","Kibungo (Ngoma)","Kibuye (Karongi)",
    "Nyamata","Rwamagana","Kayonza","Nyanza","Gisagara","Kirehe","Gatsibo",
    "Kimironko","Remera","Nyamirambo","Kicukiro","Gikondo","Kabuga","Nyacyonga",
    "Kimisagara","Kagugu","Kanombe","Giporoso","Kimihurura",
    "Kimironko Market","Nyabugogo Market","Kimisagara Market","Gisozi Market",
  ],

  Zimbabwe: [
    "Harare","Bulawayo","Chitungwiza","Mutare","Gweru","Kwekwe","Kadoma","Masvingo","Chinhoyi",
    "Marondera","Rusape","Bindura","Zvishavane","Redcliff","Beitbridge","Victoria Falls",
    "Chiredzi","Triangle","Mkoba","Mkoba Township","Dzivarasekwa","Budiriro","Glen Norah",
    "Highfield","Mbare","Kuwadzana","Epworth","Glen View","Hatfield","Eastlea","Avondale",
    "Borrowdale","Greendale","Msasa","Workington","Willowvale",
    "Mbare Musika Market","Copacabana Bus Terminus","4th Street Market",
  ],

  Zambia: [
    "Lusaka","Ndola","Kitwe","Kabwe","Chingola","Mufulira","Livingstone","Luanshya","Kasama",
    "Chipata","Mongu","Solwezi","Mazabuka","Choma","Mansa","Kalulushi","Kafue","Kapiri Mposhi",
    "Nakonde","Mpika","Petauke","Lundazi","Senanga",
    "Soweto Market Lusaka","Kamwala Market","Comesa Market","City Market Ndola",
    "Chelstone","Kanyama","Kalingalinga","Ng'ombe","Matero","Northmead","Woodlands","Ibex Hill",
  ],

  Malawi: [
    "Lilongwe","Blantyre","Mzuzu","Zomba","Mangochi","Kasungu","Salima","Balaka","Liwonde",
    "Luchenza","Mulanje","Thyolo","Chiradzulu","Nsanje","Chikwawa","Ntchisi","Dowa","Nkhotakota",
    "Nkhata Bay","Rumphi","Chitipa","Karonga",
    "Area 1 Lilongwe","Area 18","Area 25","Area 47","Kawale","Chichiri Blantyre",
    "Limbe Market","City Market Blantyre","Lilongwe City Centre Market",
  ],

  Mozambique: [
    "Maputo","Matola","Nampula","Beira","Chimoio","Nacala","Quelimane","Tete","Xai-Xai",
    "Maxixe","Inhambane","Lichinga","Pemba","Cuamba","Montepuez","Mocuba","Alto Molócue",
    "Angoche","Ilha de Moçambique","Moatize","Dondo",
    "Zimpeto","Hulene","Mavalane","Maxaquene","Polana","Sommerschield",
  ],

  Angola: [
    "Luanda","Huambo","Benguela","Lobito","Kuito","Malanje","Lubango","Cabinda","Uíge","Namibe",
    "Soyo","Menongue","Dundo","Saurimo","Luena","Ndalatando","Caxito","M'banza-Kongo",
    "Ambriz","Porto Amboim","Sumbe","Quibaxe",
    "Maculusso","Maianga","Sambizanga","Cazenga","Viana","Cacuaco","Caála",
    "Roque Santeiro Market","Kikolo Market","São Paulo Market","Rocha Pinto Market",
  ],

  Cameroon: [
    "Yaoundé","Douala","Bamenda","Garoua","Maroua","Bafoussam","Ngaoundéré","Bertoua","Edéa",
    "Kumba","Limbe","Buea","Kribi","Ebolowa","Mbalmayo","Sangmélima","Bibemi","Mokolo","Kousséri",
    "Nkongsamba","Mbouda","Dschang","Foumban","Wum",
    "Deido Douala","Akwa","Bonanjo","Bassa","New-Bell","Makepe","Essos","Mvan","Nsimalen",
    "Marché Central Yaoundé","Marché Mfoundi",
  ],

  "Ivory Coast": [
    "Abidjan","Bouaké","Daloa","Korhogo","Yamoussoukro","San-Pédro","Divo","Gagnoa","Man",
    "Abengourou","Bondoukou","Duekoué","Guiglo","Soubré","Aboisso","Grand-Bassam","Jacqueville",
    "Cocody","Marcory","Yopougon","Adjamé","Abobo","Koumassi","Port-Bouët","Treichville",
    "Attécoubé","Anyama","Songon","Bingerville",
    "Marché d'Adjamé","Marché de Cocody","Marché du Plateau",
  ],

  Senegal: [
    "Dakar","Touba","Thiès","Rufisque","Kaolack","M'Bour","Saint-Louis","Ziguinchor","Diourbel",
    "Louga","Tambacounda","Kolda","Sédhiou","Matam","Kaffrine","Kédougou",
    "Parcelles Assainies","Guédiawaye","Pikine","Yeumbeul","Thiaroye","Cambérène","Ouakam","Yoff",
    "Liberté","Almadies","Plateau Dakar",
    "Marché Sandaga","Marché Tilène","Marché HLM","Grand Marché Touba",
  ],

  "DR Congo": [
    "Kinshasa","Lubumbashi","Mbuji-Mayi","Kananga","Kisangani","Bukavu","Goma","Uvira",
    "Kolwezi","Likasi","Matadi","Butembo","Boma","Kikwit","Mbandaka","Bandundu","Tshikapa",
    "Kalemie","Mwene-Ditu","Ilebo","Bumba","Isiro","Bunia","Beni","Gemena","Inongo",
    "Kintambo","Limete","Masina","Ndjili","Kalamu","Barumbu","Gombe","Lingwala","Ngaliema",
    "Lemba","Matete","Kisenso","Maluku","Nsele","Mont-Ngafula",
    "Grand Marché Kinshasa","Marché de la Liberté","Marché Gambela",
  ],

  Sudan: [
    "Khartoum","Omdurman","Khartoum North","Port Sudan","Kassala","El Obeid","Wad Madani",
    "Gedaref","El Fasher","Nyala","El Daein","Kadugli","Kosti","Sennar","Atbara",
    "Rabak","Dongola","Karima","Shendi","Ed Damer","Zalingei","Geneina","Ed Daein",
    "Burri","Bahri","Arkaweet","Khartoum 2","Al Mugran","Riyadh","Khartoum 3",
  ],

  Somalia: [
    "Mogadishu","Hargeisa","Kismayo","Merca","Baidoa","Bosaso","Galkayo","Berbera","Burao",
    "Beledweyne","Jowhar","Afgooye","Luuq","Dolo","Garowe","Qardho","Las Anod","Borama",
    "Baki","Zeila","Baardheere","Wanlaweyn","Jilib","Bu'aale",
    "KM4 Mogadishu","Bakara Market","Hamarweyne","Hodan","Wadajir","Hawlwadag","Waberi",
  ],

  Libya: [
    "Tripoli","Benghazi","Misrata","Zawiya","Zliten","Bayda","Tobruk","Sabha","Sirte","Khoms",
    "Sabratha","Sorman","Gharyan","Bani Walid","Murzuq","Ghat","Derna","Ajdabiya","Brega",
    "Tarhuna","Zintan","Nalut","Ghadames","Ubari","Kufra",
  ],

  Morocco: [
    "Casablanca","Rabat","Fès","Marrakech","Agadir","Tangier","Meknès","Oujda","Kénitra",
    "Tétouan","Safi","Mohammedia","El Jadida","Béni Mellal","Taza","Nador","Settat","Khouribga",
    "Berrechid","Khémisset","Laâyoune","Dakhla","Tan-Tan","Ouarzazate","Errachidia","Ifrane",
    "Azrou","Midelt","Tiznit","Taroudant","Essaouira","Sidi Ifni","Guelmim",
    "Derb Omar Casablanca","Quartier Habous","Medina Fès","Medina Marrakech","Djemaa el-Fna",
  ],

  Algeria: [
    "Algiers","Oran","Constantine","Annaba","Blida","Batna","Djelfa","Sétif","Sidi Bel Abbès",
    "Biskra","Béjaïa","Tébessa","Tiaret","Tlemcen","Béchar","Mostaganem","Bordj Bou Arréridj",
    "Skikda","Msila","Médéa","Guelma","Chlef","Souk Ahras","Jijel","Bouira","El Oued","Ghardaïa",
    "Tamanrasset","Adrar","Ouargla","Laghouat","Ain Defla","Relizane","Mascara","Saïda",
    "Bab El Oued","Hussein Dey","El Harrach","Kouba","Dar El Beïda","Rouiba",
  ],

  Tunisia: [
    "Tunis","Sfax","Sousse","Kairouan","Bizerte","Gabès","Ariana","Gafsa","Monastir","Ben Arous",
    "Kasserine","Médenine","Nabeul","Tataouine","Béja","Jendouba","Mahdia","Sidi Bouzid","Tozeur",
    "Kébili","Siliana","Le Kef","Zaghouan","Manouba",
    "La Marsa","Carthage","Sidi Bou Saïd","Hammam-Lif","Hammam Sousse","Port El Kantaoui",
    "Souk El Bey","Marché Central de Tunis","Médina de Tunis",
  ],

  Egypt: [
    "Cairo","Alexandria","Giza","Shubra El-Kheima","Port Said","Suez","El-Mahalla El-Kubra",
    "Luxor","Mansoura","El-Mansura","Tanta","Asyut","Ismailia","Faiyum","Zagazig","Damietta",
    "Aswan","Minya","Damanhur","Sohag","Benisuef","Hurghada","Sharm el-Sheikh","Marsa Matruh",
    "El Minya","Qena","Sohag","Nag Hammadi","Kafr El Sheikh","Banha","Shebin El-Kom",
    "Maadi","Heliopolis","Nasr City","New Cairo","6th of October City","Sheikh Zayed",
    "Dokki","Mohandiseen","Zamalek","Downtown Cairo","Khan el-Khalili Bazaar","Attaba",
  ],

  "United Kingdom": [
    "London","Birmingham","Manchester","Glasgow","Liverpool","Leeds","Sheffield","Edinburgh",
    "Bristol","Cardiff","Leicester","Coventry","Bradford","Nottingham","Kingston upon Hull",
    "Stoke-on-Trent","Southampton","Portsmouth","Newcastle upon Tyne","Derby","Plymouth",
    "Wolverhampton","Belfast","Sunderland","Swansea","Exeter","Cambridge","Oxford","Bath",
    "Brighton","Norwich","Middlesbrough","Peterborough","Milton Keynes","Luton","Northampton",
    "Preston","Aberdeen","Dundee","Inverness","Stirling","Wrexham","Newport",
    "East London","South London","North London","West London","Croydon","Lewisham",
    "Hackney","Tower Hamlets","Newham","Peckham","Brixton","Tottenham","Wembley",
  ],

  "United States": [
    "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio",
    "San Diego","Dallas","Jacksonville","Austin","Fort Worth","Columbus","Charlotte",
    "Indianapolis","San Francisco","Seattle","Denver","Nashville","Oklahoma City","El Paso",
    "Washington DC","Las Vegas","Louisville","Memphis","Portland","Baltimore","Milwaukee",
    "Albuquerque","Tucson","Fresno","Sacramento","Kansas City","Atlanta","Omaha","Miami",
    "Minneapolis","Colorado Springs","Raleigh","Long Beach","Virginia Beach","Tampa",
    "New Orleans","Arlington","Bakersfield","Honolulu","Anaheim","Aurora","Santa Ana",
    "Corpus Christi","Riverside","Pittsburgh","Lexington","Anchorage","Stockton","Cincinnati",
    "St. Paul","Greensboro","Toledo","Newark","Plano","Henderson","Orlando","Lincoln",
    "Jersey City","Chandler","Fort Wayne","Laredo","Madison","Durham","Lubbock","Winston-Salem",
    "Garland","Glendale","Hialeah","Reno","Baton Rouge","Irvine","Chesapeake","Scottsdale",
    "North Las Vegas","Fremont","Gilbert","San Bernardino","Birmingham (AL)","Rochester",
    "Richmond","Spokane","Des Moines","Montgomery","Modesto","Fayetteville","Tacoma",
    "Akron","Yonkers","Shreveport","Augusta","Oxnard","Fontana","Moreno Valley","Glendale (CA)",
    "Huntington Beach","Little Rock","Columbus (GA)","Grand Rapids","Amarillo","Knoxville",
    "Salt Lake City","Tallahassee","Worcester","Newport News","Huntsville","Providence",
    "Garden Grove","Oceanside","Tempe","Fort Lauderdale","Santa Clarita","Vancouver (WA)",
    "Santa Rosa","Sioux Falls","Peoria","Ontario","Chattanooga","Springfield","Eugene",
    "Brownsville","Elk Grove","Cape Coral","Salinas","Fort Collins","Pembroke Pines",
  ],

  Canada: [
    "Toronto","Montreal","Vancouver","Calgary","Edmonton","Ottawa","Winnipeg","Quebec City",
    "Hamilton","Kitchener","London","Victoria","Halifax","Oshawa","Windsor","Saskatoon",
    "Regina","St. Catharines","St. John's","Sudbury","Kelowna","Barrie","Abbotsford",
    "Markham","Vaughan","Gatineau","Longueuil","Burnaby","Surrey","Richmond",
    "Mississauga","Brampton","Oakville","Burlington","Guelph","Cambridge","Waterloo",
    "Laval","Sherbrooke","Saguenay","Lévis",
  ],

  Australia: [
    "Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Newcastle","Canberra",
    "Sunshine Coast","Wollongong","Logan City","Townsville","Geelong","Hobart","Cairns",
    "Toowoomba","Darwin","Launceston","Albury","Bendigo","Ballarat","Mackay","Rockhampton",
    "Shepparton","Mildura","Wagga Wagga","Gladstone","Port Macquarie","Tamworth","Orange",
    // Suburbs
    "Parramatta","Blacktown","Liverpool","Penrith","Cabramatta","Bankstown","Fairfield",
    "Mount Druitt","Campbelltown","Auburn","Lakemba","Marrickville","Redfern",
  ],

  Germany: [
    "Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf","Dortmund",
    "Essen","Leipzig","Bremen","Dresden","Hanover","Nuremberg","Duisburg","Bochum",
    "Wuppertal","Bielefeld","Bonn","Münster","Karlsruhe","Mannheim","Augsburg","Wiesbaden",
    "Gelsenkirchen","Mönchengladbach","Braunschweig","Chemnitz","Kiel","Aachen","Halle",
    "Magdeburg","Freiburg","Krefeld","Mainz","Lübeck","Erfurt","Oberhausen","Rostock",
    "Würzburg","Saarbrücken","Heidelberg","Potsdam","Osnabrück","Oldenburg","Neuss",
  ],

  France: [
    "Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux",
    "Lille","Rennes","Reims","Le Havre","Cergy","Saint-Étienne","Toulon","Angers","Grenoble",
    "Dijon","Nîmes","Aix-en-Provence","Saint-Denis","Villeurbanne","Brest","Le Mans",
    "Amiens","Tours","Limoges","Clermont-Ferrand","Besançon","Metz","Perpignan","Orléans",
    "Mulhouse","Rouen","Poitiers","Avignon","Dunkirk","Versailles","Caen","Argenteuil",
  ],

  Netherlands: [
    "Amsterdam","Rotterdam","The Hague","Utrecht","Eindhoven","Groningen","Tilburg","Almere",
    "Breda","Nijmegen","Apeldoorn","Haarlem","Arnhem","Zaanstad","Amersfoort","'s-Hertogenbosch",
    "Maastricht","Leiden","Dordrecht","Zoetermeer","Zwolle","Deventer","Delft","Enschede",
    "Alkmaar","Venlo","Sittard-Geleen","Hilversum","Leeuwarden","Emmen","Ede","Westland",
  ],

  Norway: [
    "Oslo","Bergen","Trondheim","Stavanger","Drammen","Fredrikstad","Kristiansand","Sandnes",
    "Tromsø","Sarpsborg","Skien","Ålesund","Sandefjord","Haugesund","Tønsberg","Moss",
    "Porsgrunn","Bodø","Gjøvik","Arendal","Hamar","Harstad","Molde","Lillehammer",
  ],

  Sweden: [
    "Stockholm","Gothenburg","Malmö","Uppsala","Linköping","Västerås","Örebro","Helsingborg",
    "Norrköping","Jönköping","Umeå","Lund","Borås","Sundsvall","Karlstad","Eskilstuna",
    "Halmstad","Växjö","Gävle","Borlänge","Kalmar","Kristianstad","Skellefteå","Falun",
    "Södertälje","Östersund","Trollhättan","Ronneby","Luleå","Upplands Väsby","Sollentuna",
  ],

  Finland: [
    "Helsinki","Espoo","Tampere","Vantaa","Oulu","Turku","Jyväskylä","Lahti","Kuopio",
    "Pori","Kouvola","Joensuu","Lappeenranta","Hämeenlinna","Vaasa","Rovaniemi","Seinäjoki",
    "Kotka","Hyvinkää","Porvoo","Lohja","Järvenpää","Nurmijärvi","Rauma","Kokkola",
  ],

  Brazil: [
    "São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Manaus",
    "Curitiba","Recife","Porto Alegre","Belém","Goiânia","Guarulhos","Campinas","São Luís",
    "São Gonçalo","Maceió","Duque de Caxias","Natal","Teresina","Campo Grande","Nova Iguaçu",
    "São Bernardo do Campo","João Pessoa","Osasco","Santo André","Jaboatão dos Guararapes",
    "Ribeirão Preto","Uberlândia","Sorocaba","Contagem","Niterói","Aracaju","Feira de Santana",
  ],

  India: [
    "Mumbai","Delhi","Bengaluru","Kolkata","Chennai","Hyderabad","Ahmedabad","Pune","Surat",
    "Jaipur","Lucknow","Kanpur","Nagpur","Patna","Indore","Thane","Bhopal","Visakhapatnam",
    "Vadodara","Firozabad","Ludhiana","Rajkot","Agra","Nashik","Faridabad","Thiruvananthapuram",
    "Meerut","Aurangabad","Jabalpur","Vellore","Srinagar","Amritsar","Coimbatore","Madurai",
    "Kalyan-Dombivli","Pimpri-Chinchwad","Allahabad (Prayagraj)","Ranchi","Howrah","Gwalior",
    "Vijayawada","Jodhpur","Raipur","Kota","Chandigarh","Guwahati","Solapur","Hubli-Dharwad",
    "Tiruchirappalli","Mysuru","Bareilly","Aligarh","Moradabad","Gurugram","Noida","Varanasi",
    "Navi Mumbai","Mangaluru (Mangalore)","Kolhapur","Warangal","Puducherry","Bhubaneswar",
    "Bhiwandi","Bhagalpur","Saharanpur","Gorakhpur","Jalandhar","Dhanbad","Cuttack",
  ],

  China: [
    "Shanghai","Beijing","Chongqing","Guangzhou","Shenzhen","Tianjin","Wuhan","Dongguan",
    "Chengdu","Foshan","Nanjing","Shenyang","Hangzhou","Xi'an","Harbin","Suzhou","Qingdao",
    "Dalian","Zhengzhou","Jinan","Changchun","Nanchang","Ningbo","Shijiazhuang","Kunming",
    "Hefei","Changsha","Ürümqi","Fuzhou","Nanning","Guiyang","Taiyuan","Lanzhou","Xiamen",
    "Wuxi","Zibo","Wenzhou","Tangshan","Baotou","Huai'an","Linyi","Weifang","Nanyang",
    "Handan","Luoyang","Xuzhou","Yan'an","Lhasa","Hohhot","Xining","Yinchuan","Haikou",
  ],

  Other: [
    "My city is not listed",
  ],
};

export default CITIES_BY_COUNTRY;
