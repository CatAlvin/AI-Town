export const CIVILIZATION_VERSION = 1;
export const CIVILIZATION_RELEASE = "0.4.0";
export const CIVILIZATION_TITLE = "月铃文明";

export const WORLD_SIZE = { width: 1536, height: 1024 };

export const timeSegments = ["清晨", "午后", "黄昏", "深夜"];

export const locations = [
  { id: "clinic", name: "月芽诊所", kind: "公共服务", x: 215, y: 205, capacity: 8 },
  { id: "school", name: "霜绒学堂", kind: "公共服务", x: 480, y: 230, capacity: 10 },
  { id: "council", name: "月铃议事厅", kind: "政治", x: 770, y: 205, capacity: 16 },
  { id: "workshop", name: "绒火工坊", kind: "生产", x: 1065, y: 220, capacity: 10 },
  { id: "mine", name: "星辉矿洞", kind: "资源", x: 1370, y: 190, capacity: 12 },
  { id: "bakery", name: "焦麦面包房", kind: "商业", x: 170, y: 445, capacity: 8 },
  { id: "market", name: "铃环市集", kind: "商业", x: 430, y: 445, capacity: 18 },
  { id: "plaza", name: "月纹广场", kind: "公共空间", x: 765, y: 515, capacity: 30 },
  { id: "bank", name: "月穗银行", kind: "金融", x: 1055, y: 465, capacity: 8 },
  { id: "registry", name: "律契所", kind: "公共服务", x: 1290, y: 505, capacity: 8 },
  { id: "police", name: "灰角警署", kind: "治安", x: 220, y: 685, capacity: 10 },
  { id: "inn", name: "暖角旅店", kind: "社交", x: 520, y: 700, capacity: 14 },
  { id: "homes", name: "河灯住区", kind: "居住", x: 865, y: 730, capacity: 24 },
  { id: "farm", name: "青荚农圃", kind: "生产", x: 1260, y: 700, capacity: 12 },
  { id: "bridge", name: "月河石桥", kind: "交通", x: 760, y: 885, capacity: 14 },
];

const makeCitizen = (id, name, species, role, trait, goal, speciesKey, fur, accent, home, work, salary, wealth, personality) => ({
  id,
  name,
  species,
  role,
  trait,
  goal,
  speciesKey,
  colors: { fur, accent },
  home,
  work,
  salary,
  wealth,
  personality,
});

export const citizenTemplates = [
  makeCitizen("vella", "薇萝", "红狐兽人", "守铃议员", "温柔直白，从不回避坏消息", "重建公开透明的议事制度", "fox", "#c95d45", "#e9c46a", "homes", "council", 46, 720, [84, 64, 82, 34, 88, 72]),
  makeCitizen("hazel", "铁榛", "獾兽人", "月铁匠", "嘴硬心软，会把担心敲进铁里", "建立保护工匠的铸造行会", "badger", "#5d6670", "#e07a4f", "homes", "workshop", 55, 840, [50, 78, 76, 42, 90, 38]),
  makeCitizen("milu", "米露", "垂耳兔兽人", "市集商人", "把价格说得像天气预报一样认真", "成为全城最可信的商人", "rabbit", "#d8a77b", "#4f8f78", "homes", "market", 42, 930, [72, 70, 68, 52, 74, 82]),
  makeCitizen("loran", "洛岚", "灰狼兽人", "边路巡守", "先观察再行动，答应的事绝不拖延", "让夜路不再有人失踪", "wolf", "#667687", "#d8b15d", "homes", "police", 49, 610, [62, 48, 88, 36, 94, 44]),
  makeCitizen("antla", "琥芽", "鹿兽人", "草药师", "能闻出雨前泥土和谎话的味道", "建立不问贫富的免费诊疗所", "deer", "#b98255", "#668f68", "homes", "clinic", 44, 540, [90, 42, 80, 30, 72, 66]),
  makeCitizen("owen", "羽铃", "鸮族兽人", "夜巡抄写员", "白天迷糊，夜里记得每一次脚步声", "写成月铃镇第一部完整城史", "owl", "#716481", "#d7b86e", "school", "council", 38, 470, [76, 34, 86, 28, 82, 32]),
  makeCitizen("sable", "砂栗", "松鼠兽人", "桥匠学徒", "紧张时会默数工具袋里的木钉", "修出一座永不垮塌的桥", "squirrel", "#a86d4f", "#4e8291", "homes", "bridge", 32, 290, [68, 66, 74, 46, 80, 58]),
  makeCitizen("moss", "银苔", "山羊兽人", "旅店老板", "记得每位客人第一次沉默的原因", "让旅店永远保持中立", "goat", "#d1c6aa", "#5d7968", "inn", "inn", 50, 1120, [82, 54, 70, 36, 78, 88]),
  makeCitizen("rye", "焦麦", "橘猫兽人", "面包师", "爱夸张宣传，也会偷偷担心失败", "把面包店开成月铃镇的招牌", "cat", "#d88445", "#b7463b", "homes", "bakery", 36, 420, [64, 82, 56, 68, 58, 84]),
  makeCitizen("heyan", "湖砚", "河狸兽人", "建筑师", "凡事先画三张图再开口", "重新规划拥挤的旧城区", "beaver", "#8f6547", "#4d7895", "homes", "bridge", 52, 760, [78, 70, 84, 34, 92, 46]),
  makeCitizen("luzhao", "露爪", "雪貂兽人", "信使", "好奇又话多，总能发现绕路的秘密", "成为全城最快也最可靠的信使", "ferret", "#d6c2a5", "#bd5345", "inn", "registry", 34, 330, [86, 54, 62, 80, 52, 94]),
  makeCitizen("mofin", "沫鳍", "海豹兽人", "河港渔夫", "随和迷信，相信河底藏着古城", "证明月河里真的有古代宝藏", "seal", "#7594a4", "#e4b858", "homes", "bridge", 35, 390, [74, 50, 68, 72, 62, 70]),
  makeCitizen("dengsha", "灯砂", "耳廓狐兽人", "勘探员", "大胆敏锐，对闪光的石头毫无抵抗力", "找到一条足以改变命运的矿脉", "fennec", "#d8a15d", "#3f7484", "inn", "mine", 41, 510, [58, 94, 52, 96, 48, 72]),
  makeCitizen("suijiao", "燧角", "野牛兽人", "采石工", "沉默强硬，只在工钱问题上提高嗓门", "让矿工获得更公平的工资", "bison", "#66574f", "#c55f43", "homes", "mine", 44, 360, [66, 78, 72, 40, 88, 36]),
  makeCitizen("mianzhi", "棉枝", "羊驼兽人", "裁缝", "挑剔爱美，能一眼看出衣领歪了", "让自己的衣服成为身份象征", "alpaca", "#dfd0b8", "#b64d5d", "homes", "market", 39, 680, [70, 88, 64, 58, 66, 76]),
  makeCitizen("wuyan", "乌檐", "乌鸦兽人", "律契师", "记仇但讲规则，从不忘记落款", "掌握全城最重要的商业契约", "crow", "#3d4650", "#d19a45", "school", "registry", 58, 1240, [40, 96, 86, 44, 90, 60]),
  makeCitizen("qingjia", "青荚", "水豚兽人", "农场主", "情绪稳定，争吵时总先端来一杯水", "让所有居民冬天都有粮食", "capybara", "#9b7353", "#668a58", "farm", "farm", 40, 810, [94, 46, 82, 24, 86, 78]),
  makeCitizen("suokui", "索葵", "花豹兽人", "剧团演员", "魅力十足，连道歉都像在谢幕", "进入议会推动公共文化", "leopard", "#c69249", "#934b5e", "inn", "plaza", 37, 560, [64, 92, 48, 76, 44, 98]),
  makeCitizen("duansui", "短穗", "田鼠兽人", "城库账房", "胆小精确，看到错账会整夜睡不着", "查清城库里消失的钱", "mouse", "#9b8a73", "#477a73", "homes", "bank", 45, 590, [70, 56, 94, 16, 98, 34]),
  makeCitizen("shuangrong", "霜绒", "北极狐兽人", "教师", "理想主义，愿意听孩子问一百遍为什么", "建立不看财富的公共学校", "arcticFox", "#dbe1df", "#557aa0", "school", "school", 40, 430, [96, 58, 88, 32, 80, 74]),
  makeCitizen("lingdou", "铃豆", "野猪兽人", "厨师", "豪爽护短，生气时切菜格外整齐", "举办全城最大的团圆宴", "boar", "#8f6755", "#ce7442", "inn", "inn", 38, 520, [80, 62, 60, 64, 70, 90]),
  makeCitizen("heitan", "黑檀", "黑豹兽人", "酒馆歌手", "外冷内热，只把真话写进歌里", "还清旧债并重新开始", "panther", "#343b43", "#bd6a62", "inn", "inn", 33, 180, [72, 68, 50, 58, 46, 86]),
  makeCitizen("liujiao", "琉角", "羚羊兽人", "珠宝匠", "野心强，擅长把欲望说成审美", "通过黄金生意进入上层社会", "antelope", "#b68a64", "#497a85", "homes", "market", 52, 1350, [46, 98, 66, 74, 76, 72]),
  makeCitizen("bohe", "薄荷", "刺猬兽人", "医师", "谨慎洁癖，会认真记录每次咳嗽", "阻止下一场传染病", "hedgehog", "#8b735f", "#4f8a72", "clinic", "clinic", 51, 780, [92, 52, 96, 18, 98, 40]),
  makeCitizen("yanzhen", "岩阵", "犀牛兽人", "治安官", "重秩序但固执，认错比追贼更难", "把严重犯罪降到最低", "rhino", "#6f7775", "#b85446", "police", "police", 56, 890, [54, 74, 78, 30, 96, 42]),
  makeCitizen("zhemu", "柘木", "驴兽人", "木匠", "勤劳悲观，总觉得明天木料会涨价", "攒钱买下自己的房屋", "donkey", "#8d755f", "#4f798d", "homes", "workshop", 39, 260, [76, 60, 90, 22, 92, 50]),
  makeCitizen("jinwei", "烬尾", "蜥蜴兽人", "炉火研究者", "冷静大胆，把爆炸叫作数据", "发明更便宜的城镇能源", "lizard", "#66836c", "#d16142", "school", "workshop", 48, 630, [48, 90, 82, 92, 72, 36]),
  makeCitizen("muya", "暮芽", "浣熊兽人", "废品回收商", "机灵爱占便宜，见不得东西被浪费", "把废品回收做成大生意", "raccoon", "#59636a", "#d0a44b", "homes", "market", 31, 340, [56, 86, 44, 88, 42, 80]),
  makeCitizen("baili", "白砾", "白熊兽人", "石屋营造师", "慢热可靠，习惯替所有人检查门闩", "建造能抵御灾害的避难所", "bear", "#d3d6d2", "#577486", "homes", "workshop", 50, 700, [88, 64, 92, 26, 96, 30]),
  makeCitizen("liuying", "柳影", "天鹅兽人", "银行经理", "优雅克制，算利息时从不眨眼", "让银行掌握城镇的发展方向", "swan", "#e0ddd4", "#a9464f", "homes", "bank", 64, 1820, [44, 96, 74, 38, 92, 68]),
];

export const relationshipTypes = {
  friend: { label: "朋友", color: "#3f8c72" },
  love: { label: "爱慕", color: "#c65769" },
  enemy: { label: "敌对", color: "#b75143" },
  debt: { label: "债务", color: "#c4913f" },
  work: { label: "同事", color: "#4f7894" },
  influence: { label: "影响", color: "#78689a" },
};

export const godEventCatalog = {
  economic_crisis: {
    type: "economic_crisis",
    label: "经济危机",
    description: "收入下降、债务承压，互助与冲突都会增加。",
    duration: 12,
  },
  gold_discovery: {
    type: "gold_discovery",
    label: "发现黄金",
    description: "矿业繁荣与人口流入并存，财富差距和犯罪风险上升。",
    duration: 16,
  },
  heavy_rain: {
    type: "heavy_rain",
    label: "连日暴雨",
    description: "道路受阻、粮价上涨，桥梁和公共救助受到考验。",
    duration: 7,
  },
  festival: {
    type: "festival",
    label: "全城庆典",
    description: "消费和关系升温，但城库需要承担开支。",
    duration: 4,
  },
  early_election: {
    type: "early_election",
    label: "提前选举",
    description: "政治竞争立刻升温，居民重新评估候选人。",
    duration: 5,
  },
  merchant_arrival: {
    type: "merchant_arrival",
    label: "富商来访",
    description: "新资本进入城镇，带来工作，也带来利益争夺。",
    duration: 8,
  },
};

export const metricDefinitions = [
  { id: "population", label: "人口", unit: "人", goodWhen: "up" },
  { id: "wealth", label: "财富", unit: "币", goodWhen: "up" },
  { id: "crime", label: "治安压力", unit: "", goodWhen: "down" },
  { id: "relationships", label: "社会信任", unit: "", goodWhen: "up" },
  { id: "politics", label: "政治稳定", unit: "", goodWhen: "up" },
];

export const getLocation = (id) => locations.find((location) => location.id === id) || locations[0];
export const getCitizenTemplate = (id) => citizenTemplates.find((citizen) => citizen.id === id);
