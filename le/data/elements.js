/*
 * The 118 elements: [number, symbol, name, mass, group (0 = f-block row), period, block, type, phase at room temp].
 * Masses in brackets in the UI are the most stable isotope's mass number.
 */
window.ELEMENTS = (function () {
  var T = {
    AM: 'Alkali metal', AE: 'Alkaline earth', TM: 'Transition metal', PT: 'Post-transition', ML: 'Metalloid',
    NM: 'Nonmetal', HA: 'Halogen', NG: 'Noble gas', LA: 'Lanthanide', AC: 'Actinide'
  };
  var raw = [
    [1,'H','Hydrogen',1.008,1,1,'s','NM','Gas'],[2,'He','Helium',4.0026,18,1,'s','NG','Gas'],
    [3,'Li','Lithium',6.94,1,2,'s','AM','Solid'],[4,'Be','Beryllium',9.0122,2,2,'s','AE','Solid'],
    [5,'B','Boron',10.81,13,2,'p','ML','Solid'],[6,'C','Carbon',12.011,14,2,'p','NM','Solid'],
    [7,'N','Nitrogen',14.007,15,2,'p','NM','Gas'],[8,'O','Oxygen',15.999,16,2,'p','NM','Gas'],
    [9,'F','Fluorine',18.998,17,2,'p','HA','Gas'],[10,'Ne','Neon',20.18,18,2,'p','NG','Gas'],
    [11,'Na','Sodium',22.99,1,3,'s','AM','Solid'],[12,'Mg','Magnesium',24.305,2,3,'s','AE','Solid'],
    [13,'Al','Aluminium',26.982,13,3,'p','PT','Solid'],[14,'Si','Silicon',28.085,14,3,'p','ML','Solid'],
    [15,'P','Phosphorus',30.974,15,3,'p','NM','Solid'],[16,'S','Sulfur',32.06,16,3,'p','NM','Solid'],
    [17,'Cl','Chlorine',35.45,17,3,'p','HA','Gas'],[18,'Ar','Argon',39.948,18,3,'p','NG','Gas'],
    [19,'K','Potassium',39.098,1,4,'s','AM','Solid'],[20,'Ca','Calcium',40.078,2,4,'s','AE','Solid'],
    [21,'Sc','Scandium',44.956,3,4,'d','TM','Solid'],[22,'Ti','Titanium',47.867,4,4,'d','TM','Solid'],
    [23,'V','Vanadium',50.942,5,4,'d','TM','Solid'],[24,'Cr','Chromium',51.996,6,4,'d','TM','Solid'],
    [25,'Mn','Manganese',54.938,7,4,'d','TM','Solid'],[26,'Fe','Iron',55.845,8,4,'d','TM','Solid'],
    [27,'Co','Cobalt',58.933,9,4,'d','TM','Solid'],[28,'Ni','Nickel',58.693,10,4,'d','TM','Solid'],
    [29,'Cu','Copper',63.546,11,4,'d','TM','Solid'],[30,'Zn','Zinc',65.38,12,4,'d','TM','Solid'],
    [31,'Ga','Gallium',69.723,13,4,'p','PT','Solid'],[32,'Ge','Germanium',72.63,14,4,'p','ML','Solid'],
    [33,'As','Arsenic',74.922,15,4,'p','ML','Solid'],[34,'Se','Selenium',78.971,16,4,'p','NM','Solid'],
    [35,'Br','Bromine',79.904,17,4,'p','HA','Liquid'],[36,'Kr','Krypton',83.798,18,4,'p','NG','Gas'],
    [37,'Rb','Rubidium',85.468,1,5,'s','AM','Solid'],[38,'Sr','Strontium',87.62,2,5,'s','AE','Solid'],
    [39,'Y','Yttrium',88.906,3,5,'d','TM','Solid'],[40,'Zr','Zirconium',91.224,4,5,'d','TM','Solid'],
    [41,'Nb','Niobium',92.906,5,5,'d','TM','Solid'],[42,'Mo','Molybdenum',95.95,6,5,'d','TM','Solid'],
    [43,'Tc','Technetium',98,7,5,'d','TM','Solid'],[44,'Ru','Ruthenium',101.07,8,5,'d','TM','Solid'],
    [45,'Rh','Rhodium',102.91,9,5,'d','TM','Solid'],[46,'Pd','Palladium',106.42,10,5,'d','TM','Solid'],
    [47,'Ag','Silver',107.87,11,5,'d','TM','Solid'],[48,'Cd','Cadmium',112.41,12,5,'d','TM','Solid'],
    [49,'In','Indium',114.82,13,5,'p','PT','Solid'],[50,'Sn','Tin',118.71,14,5,'p','PT','Solid'],
    [51,'Sb','Antimony',121.76,15,5,'p','ML','Solid'],[52,'Te','Tellurium',127.6,16,5,'p','ML','Solid'],
    [53,'I','Iodine',126.9,17,5,'p','HA','Solid'],[54,'Xe','Xenon',131.29,18,5,'p','NG','Gas'],
    [55,'Cs','Caesium',132.91,1,6,'s','AM','Solid'],[56,'Ba','Barium',137.33,2,6,'s','AE','Solid'],
    [57,'La','Lanthanum',138.91,0,6,'f','LA','Solid'],[58,'Ce','Cerium',140.12,0,6,'f','LA','Solid'],
    [59,'Pr','Praseodymium',140.91,0,6,'f','LA','Solid'],[60,'Nd','Neodymium',144.24,0,6,'f','LA','Solid'],
    [61,'Pm','Promethium',145,0,6,'f','LA','Solid'],[62,'Sm','Samarium',150.36,0,6,'f','LA','Solid'],
    [63,'Eu','Europium',151.96,0,6,'f','LA','Solid'],[64,'Gd','Gadolinium',157.25,0,6,'f','LA','Solid'],
    [65,'Tb','Terbium',158.93,0,6,'f','LA','Solid'],[66,'Dy','Dysprosium',162.5,0,6,'f','LA','Solid'],
    [67,'Ho','Holmium',164.93,0,6,'f','LA','Solid'],[68,'Er','Erbium',167.26,0,6,'f','LA','Solid'],
    [69,'Tm','Thulium',168.93,0,6,'f','LA','Solid'],[70,'Yb','Ytterbium',173.05,0,6,'f','LA','Solid'],
    [71,'Lu','Lutetium',174.97,3,6,'d','LA','Solid'],[72,'Hf','Hafnium',178.49,4,6,'d','TM','Solid'],
    [73,'Ta','Tantalum',180.95,5,6,'d','TM','Solid'],[74,'W','Tungsten',183.84,6,6,'d','TM','Solid'],
    [75,'Re','Rhenium',186.21,7,6,'d','TM','Solid'],[76,'Os','Osmium',190.23,8,6,'d','TM','Solid'],
    [77,'Ir','Iridium',192.22,9,6,'d','TM','Solid'],[78,'Pt','Platinum',195.08,10,6,'d','TM','Solid'],
    [79,'Au','Gold',196.97,11,6,'d','TM','Solid'],[80,'Hg','Mercury',200.59,12,6,'d','TM','Liquid'],
    [81,'Tl','Thallium',204.38,13,6,'p','PT','Solid'],[82,'Pb','Lead',207.2,14,6,'p','PT','Solid'],
    [83,'Bi','Bismuth',208.98,15,6,'p','PT','Solid'],[84,'Po','Polonium',209,16,6,'p','PT','Solid'],
    [85,'At','Astatine',210,17,6,'p','HA','Solid'],[86,'Rn','Radon',222,18,6,'p','NG','Gas'],
    [87,'Fr','Francium',223,1,7,'s','AM','Solid'],[88,'Ra','Radium',226,2,7,'s','AE','Solid'],
    [89,'Ac','Actinium',227,0,7,'f','AC','Solid'],[90,'Th','Thorium',232.04,0,7,'f','AC','Solid'],
    [91,'Pa','Protactinium',231.04,0,7,'f','AC','Solid'],[92,'U','Uranium',238.03,0,7,'f','AC','Solid'],
    [93,'Np','Neptunium',237,0,7,'f','AC','Solid'],[94,'Pu','Plutonium',244,0,7,'f','AC','Solid'],
    [95,'Am','Americium',243,0,7,'f','AC','Solid'],[96,'Cm','Curium',247,0,7,'f','AC','Solid'],
    [97,'Bk','Berkelium',247,0,7,'f','AC','Solid'],[98,'Cf','Californium',251,0,7,'f','AC','Solid'],
    [99,'Es','Einsteinium',252,0,7,'f','AC','Solid'],[100,'Fm','Fermium',257,0,7,'f','AC','Solid'],
    [101,'Md','Mendelevium',258,0,7,'f','AC','Solid'],[102,'No','Nobelium',259,0,7,'f','AC','Solid'],
    [103,'Lr','Lawrencium',266,3,7,'d','AC','Solid'],[104,'Rf','Rutherfordium',267,4,7,'d','TM','Solid'],
    [105,'Db','Dubnium',268,5,7,'d','TM','Solid'],[106,'Sg','Seaborgium',269,6,7,'d','TM','Solid'],
    [107,'Bh','Bohrium',270,7,7,'d','TM','Solid'],[108,'Hs','Hassium',277,8,7,'d','TM','Solid'],
    [109,'Mt','Meitnerium',278,9,7,'d','TM','Solid'],[110,'Ds','Darmstadtium',281,10,7,'d','TM','Solid'],
    [111,'Rg','Roentgenium',282,11,7,'d','TM','Solid'],[112,'Cn','Copernicium',285,12,7,'d','TM','Solid'],
    [113,'Nh','Nihonium',286,13,7,'p','PT','Solid'],[114,'Fl','Flerovium',289,14,7,'p','PT','Solid'],
    [115,'Mc','Moscovium',290,15,7,'p','PT','Solid'],[116,'Lv','Livermorium',293,16,7,'p','PT','Solid'],
    [117,'Ts','Tennessine',294,17,7,'p','HA','Solid'],[118,'Og','Oganesson',294,18,7,'p','NG','Solid']
  ];
  var ALT = { 13: ['Aluminum'], 55: ['Cesium'], 16: ['Sulphur'] };
  return raw.map(function (r) {
    return { z: r[0], sym: r[1], name: r[2], mass: r[3], group: r[4], period: r[5], block: r[6], type: T[r[7]], phase: r[8],
             alt: ALT[r[0]] || [] };
  });
})();
