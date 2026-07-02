# Moment.js 入门教程：安装、格式化、时间修改与常用方法

Moment.js 是一个经典的 JavaScript 日期时间处理库。虽然现在很多新项目会考虑使用 Day.js、date-fns 或原生 `Intl` API，但在不少老项目和已有系统中，Moment.js 仍然很常见。

这篇文章整理 Moment.js 的基础用法，主要包括：

```text
1. Moment.js 的安装与引入
2. moment() 函数的基本使用
3. format() 日期格式化
4. Getter 和 Setter 方法
5. add() 与 subtract() 时间加减
6. startOf()、endOf()、utc()、unix() 等常用方法
```tsx

---

## 一、Moment.js 的安装方式

Moment.js 有两种常见使用方式。

第一种是直接在 HTML 中引入 `moment.min.js` 文件：

```html
<script src="./moment.min.js"></script>
<script>
  console.log(moment().format());
</script>
```

这种方式适合普通 HTML 页面，不需要构建工具。

第二种是通过 npm 安装：

```bash
npm install moment
```text

如果你的项目使用 CommonJS，可以这样引入：

```js
const moment = require("moment");
```

如果你的项目使用 ES Module，可以在 `package.json` 中设置：

```json
{
  "type": "module"
}
```text

然后使用：

```js
import moment from "moment";
```

在现代前端项目中，更常见的是第二种方式，也就是通过 npm 安装并引入。

---

## 二、moment() 函数是什么？

Moment.js 默认导出的是一个顶层函数，也就是 `moment()`。

直接调用它，会返回当前时间对应的 Moment 对象：

```js
import moment from "moment";

const now = moment();

console.log(now);
```text

如果想把 Moment 对象转成可读的字符串，可以使用 `format()` 方法：

```js
console.log(moment().format());
```

`format()` 默认会输出当前本地时间戳。

---

## 三、format() 方法：日期格式化

`format()` 是 Moment.js 中最常用的方法之一。

它可以根据传入的格式字符串，返回不同形式的日期时间。

例如：

```js
console.log(moment().format("YYYY-MM-DD"));
```text

输出类似：

```text
2026-07-01
```

格式字符串中的每个符号都有特定含义。

---

## 四、月份格式：M / MM / MMM / MMMM / Mo

月份使用大写 `M` 表示。

### 1. `MMMM`：完整月份名称

```js
moment().format("MMMM");
```text

输出示例：

```text
July
```

### 2. `MMM`：月份缩写

```js
moment().format("MMM");
```text

输出示例：

```text
Jul
```

### 3. `MM`：两位数字月份

```js
moment().format("MM");
```text

输出示例：

```text
07
```

### 4. `M`：普通数字月份

```js
moment().format("M");
```text

输出示例：

```text
7
```

### 5. `Mo`：带序数的月份

```js
moment().format("Mo");
```text

输出示例：

```text
7th
```

可以简单记：

```text
M      7
MM     07
MMM    Jul
MMMM   July
Mo     7th
```text

一般来说，`M` 最多用到四个。超过四个时，Moment 会按照已有规则进行拼接，实际开发中很少这样写。

---

## 五、日期格式：D / DD / Do / DDD / DDDD

大写 `D` 表示日期相关内容。

### 1. `D`：一个月中的第几天

```js
moment().format("D");
```

输出示例：

```text
1
```text

### 2. `DD`：两位日期

```js
moment().format("DD");
```

输出示例：

```text
01
```text

### 3. `Do`：带序数的日期

```js
moment().format("Do");
```

输出示例：

```text
1st
```text

### 4. `DDD`：一年中的第几天

```js
moment().format("DDD");
```

输出示例：

```text
182
```text

### 5. `DDDD`：一年中的第几天，三位格式

```js
moment().format("DDDD");
```

输出示例：

```text
182
```text

可以简单记：

```text
D      一个月中的第几天，例如 1
DD     两位日期，例如 01
Do     带序数的日期，例如 1st
DDD    一年中的第几天
DDDD   一年中的第几天，通常补足三位
```

---

## 六、星期格式：d / dd / ddd / dddd

小写 `d` 表示星期。

### 1. `d`：星期数字

```js
moment().format("d");
```text

返回范围是：

```text
0 - 6
```

其中：

```text
0 表示 Sunday
6 表示 Saturday
```text

### 2. `dd`：两字符星期缩写

```js
moment().format("dd");
```

输出示例：

```text
We
```text

### 3. `ddd`：三字符星期缩写

```js
moment().format("ddd");
```

输出示例：

```text
Wed
```text

### 4. `dddd`：完整星期名称

```js
moment().format("dddd");
```

输出示例：

```text
Wednesday
```text

可以简单记：

```text
d       3
dd      We
ddd     Wed
dddd    Wednesday
```

---

## 七、年份格式：YY / YYYY

年份主要使用大写 `Y`。

### 1. `YY`：两位年份

```js
moment().format("YY");
```text

输出示例：

```text
26
```

### 2. `YYYY`：四位年份

```js
moment().format("YYYY");
```text

输出示例：

```text
2026
```

常用写法一般就是：

```js
moment().format("YYYY-MM-DD");
```text

---

## 八、小时、分钟、秒与 AM/PM

小时有两种格式。

### 1. `H` / `HH`：24 小时制

```js
moment().format("H");
moment().format("HH");
```

`H` 返回 `0-23`，`HH` 返回两位格式。

例如：

```text
9
09
```text

### 2. `h` / `hh`：12 小时制

```js
moment().format("h");
moment().format("hh");
```

`h` 返回 `1-12`，`hh` 返回两位格式。

### 3. `m` / `mm`：分钟

注意，分钟是小写 `m`，不是大写 `M`。

```js
moment().format("m");
moment().format("mm");
```text

### 4. `s` / `ss`：秒

```js
moment().format("s");
moment().format("ss");
```

### 5. `SSS`：毫秒

```js
moment().format("SSS");
```text

### 6. `a` / `A`：上午下午

```js
moment().format("a");
moment().format("A");
```

输出示例：

```text
am
AM
```text

常见完整时间格式：

```js
moment().format("YYYY-MM-DD HH:mm:ss");
```

输出示例：

```text
2026-07-01 14:35:08
```text

如果要 12 小时制：

```js
moment().format("YYYY-MM-DD hh:mm:ss A");
```

输出示例：

```text
2026-07-01 02:35:08 PM
```text

---

## 九、常见日期格式示例

### 1. 年-月-日

```js
moment().format("YYYY-MM-DD");
```

输出示例：

```text
2026-07-01
```text

也可以换成斜杠：

```js
moment().format("YYYY/MM/DD");
```

输出示例：

```text
2026/07/01
```text

或者使用下划线：

```js
moment().format("YYYY_MM_DD");
```

输出示例：

```text
2026_07_01
```text

分隔符可以根据需求自定义。

---

### 2. 月份 日期 年份

```js
moment().format("MMMM Do, YYYY");
```

输出示例：

```text
July 1st, 2026
```text

这里：

```text
MMMM 表示完整月份
Do 表示带序数的日期
YYYY 表示四位年份
```

---

### 3. 星期 + 日期

```js
moment().format("dddd, MMMM Do, YYYY");
```text

输出示例：

```text
Wednesday, July 1st, 2026
```

---

### 4. 完整日期时间

```js
moment().format("YYYY-MM-DD HH:mm:ss.SSS");
```text

输出示例：

```text
2026-07-01 14:35:08.123
```

---

## 十、如何输出普通文本？

有时候我们想输出这样的格式：

```text
1st of July
```text

你可能会写：

```js
moment().format("Do of MMMM");
```

但这样可能会出现奇怪结果。

原因是：`format()` 会把字符串里的某些字符当作格式符解析。

例如：

```text
H 表示小时
d 表示星期
e 表示本地星期编号
```text

如果普通文本里刚好包含这些字符，就可能被 Moment.js 误解析。

解决方法是：用方括号包住普通文本。

```js
moment().format("Do [of] MMMM");
```

输出：

```text
1st of July
```text

也就是说：

```text
方括号 [] 中的内容不会被当作格式符解析。
```

这是 Moment.js 格式化时非常常用的技巧。

---

## 十一、本地化格式：L / LL / LLL / LLLL

Moment.js 也提供了一些本地化格式。

### 1. `LT`：时间，通常是 12 小时制

```js
moment().format("LT");
```text

输出示例：

```text
2:35 PM
```

### 2. `LTS`：带秒数的时间

```js
moment().format("LTS");
```text

输出示例：

```text
2:35:08 PM
```

### 3. `L`：短日期格式

```js
moment().format("L");
```text

输出示例：

```text
07/01/2026
```

### 4. `LL`：完整月份日期格式

```js
moment().format("LL");
```text

输出示例：

```text
July 1, 2026
```

### 5. `LLL`：日期 + 时间

```js
moment().format("LLL");
```text

输出示例：

```text
July 1, 2026 2:35 PM
```

### 6. `LLLL`：星期 + 日期 + 时间

```js
moment().format("LLLL");
```text

输出示例：

```text
Wednesday, July 1, 2026 2:35 PM
```

小写的 `l`、`ll`、`lll`、`llll` 是对应大写格式的简短版本。

例如：

```js
moment().format("llll");
```text

可能输出：

```text
Wed, Jul 1, 2026 2:35 PM
```

---

## 十二、Getter 和 Setter 方法

Moment.js 中有很多 Getter / Setter 方法。

如果不传参数，就是获取值。
如果传参数，就是设置值。

例如：

```js
const time = moment();

console.log(time.second());
```text

这里是获取当前秒数。

如果传入参数：

```js
const time = moment();

time.second(30);

console.log(time.format("HH:mm:ss"));
```

这里就是把秒数设置为 `30`。

---

## 十三、毫秒：millisecond() / milliseconds()

获取当前毫秒：

```js
moment().millisecond();
```text

设置毫秒：

```js
moment().millisecond(500);
```

参数范围通常是：

```text
0 - 999
```text

如果超过 `999`，Moment.js 会自动进位到秒。

例如：

```js
moment().millisecond(1000);
```

就会向秒数进位。

---

## 十四、秒、分钟、小时

### 1. second() / seconds()

获取秒：

```js
moment().second();
```text

设置秒：

```js
moment().second(45);
```

参数范围：

```text
0 - 59
```text

如果超过 `59`，会向分钟进位。

---

### 2. minute() / minutes()

获取分钟：

```js
moment().minute();
```

设置分钟：

```js
moment().minute(30);
```text

参数范围：

```text
0 - 59
```

超过范围会向小时进位。

---

### 3. hour() / hours()

获取小时：

```js
moment().hour();
```text

设置小时：

```js
moment().hour(20);
```

参数范围：

```text
0 - 23
```text

超过范围会向天进位。

---

## 十五、日期与星期

### 1. date()

`date()` 用来获取或设置一个月中的第几天。

获取：

```js
moment().date();
```

设置：

```js
moment().date(15);
```text

参数通常是：

```text
1 - 31
```

如果超过当前月份范围，会自动进位到下个月。

---

### 2. day()

`day()` 用来获取或设置星期几。

获取：

```js
moment().day();
```text

返回范围是：

```text
0 - 6
```

其中：

```text
0 表示 Sunday
6 表示 Saturday
```text

设置：

```js
moment().day(3);
```

表示设置为当前周的星期三。

如果传入超过 `6` 的值，会自动进位到后面的周。

---

### 3. weekday()

`weekday()` 会根据当前 locale 的一周起始日来计算。

如果当前地区把周一作为一周第一天：

```js
moment().weekday(0);
```text

表示周一。

如果当前地区把周日作为一周第一天：

```js
moment().weekday(0);
```

表示周日。

所以 `weekday()` 和地区设置有关。

---

### 4. isoWeekday()

`isoWeekday()` 使用 ISO 标准。

```js
moment().isoWeekday();
```text

返回范围是：

```text
1 - 7
```

其中：

```text
1 表示 Monday
7 表示 Sunday
```text

它也可以接收字符串：

```js
moment().isoWeekday("Monday");
```

---

## 十六、月份、季度与年份

### 1. month()

获取月份：

```js
moment().month();
```text

注意：Moment.js 中 `month()` 返回的是 `0 - 11`。

```text
0 表示 January
11 表示 December
```

设置月份：

```js
moment().month(11);
```text

表示设置为 12 月。

这是初学者很容易踩坑的地方。

---

### 2. quarter()

获取季度：

```js
moment().quarter();
```

设置季度：

```js
moment().quarter(2);
```text

表示第二季度。

---

### 3. year()

获取年份：

```js
moment().year();
```

设置年份：

```js
moment().year(2030);
```text

---

## 十七、通用 Getter：get()

除了使用 `year()`、`month()`、`date()` 这些单独方法，Moment.js 还提供了通用的 `get()` 方法。

例如：

```js
const now = moment();

console.log(now.get("year"));
console.log(now.get("month"));
console.log(now.get("date"));
console.log(now.get("hour"));
console.log(now.get("minute"));
console.log(now.get("second"));
console.log(now.get("millisecond"));
```

`get()` 支持完整单位、复数单位和缩写。

例如：

```js
moment().get("years");
moment().get("M");
moment().get("D");
moment().get("h");
moment().get("m");
moment().get("s");
moment().get("ms");
```text

所以如果你不想记太多单独方法，可以优先记住 `get()`。

---

## 十八、通用 Setter：set()

`set()` 是通用设置方法。

它可以接收两个参数：

```js
moment().set("year", 2030);
```

第一个参数是时间单位，第二个参数是要设置的值。

例如：

```js
moment().set("year", 2030).set("month", 11).set("date", 25);
```text

也可以直接传对象，一次设置多个值：

```js
moment().set({
  year: 2030,
  month: 11,
  date: 25,
  hour: 10,
  minute: 30,
  second: 0,
});
```

这种对象写法在真实项目中更常用，因为它可以一次性设置多个时间字段，代码更清晰。

注意：

```text
month 的值仍然是 0 - 11。
0 是 January，11 是 December。
```text

例如：

```js
moment().set({
  year: 2026,
  month: 6,
  date: 1,
});
```

这里的 `month: 6` 表示 7 月，不是 6 月。

---

## 十九、add()：增加时间

`add()` 方法用于在当前时间基础上增加一段时间。

基本语法：

```js
moment().add(数量, "单位");
```text

例如增加 7 天：

```js
moment().add(7, "days");
```

如果今天是 2026-07-01，那么结果就是：

```text
2026-07-08
```text

也可以增加月份、年份、小时、分钟等：

```js
moment().add(1, "year");
moment().add(2, "months");
moment().add(3, "hours");
moment().add(30, "minutes");
```

也可以对指定日期进行加法：

```js
moment("08-12-2022", "DD-MM-YYYY").add(7, "days");
```text

表示在 2022 年 12 月 8 日基础上增加 7 天。

---

## 二十、subtract()：减少时间

`subtract()` 和 `add()` 相反，用于减少一段时间。

例如减少 7 天：

```js
moment().subtract(7, "days");
```

也可以减少月份、年份、小时、分钟：

```js
moment().subtract(1, "year");
moment().subtract(2, "months");
moment().subtract(3, "hours");
moment().subtract(30, "minutes");
```text

对指定日期减少时间：

```js
moment("08-12-2022", "DD-MM-YYYY").subtract(7, "days");
```

结果是：

```text
2022-12-01
```text

---

## 二十一、startOf()：获取某个时间单位的开始

`startOf()` 用来获取某个时间单位的开始时间。

例如获取今年的开始：

```js
moment().startOf("year");
```

结果是今年的：

```text
1 月 1 日 00:00:00.000
```text

获取本月开始：

```js
moment().startOf("month");
```

结果是本月第一天：

```text
00:00:00.000
```text

获取今天开始：

```js
moment().startOf("day");
```

结果是今天：

```text
00:00:00.000
```text

常见单位包括：

```text
year
quarter
month
week
day
hour
minute
second
```

---

## 二十二、endOf()：获取某个时间单位的结束

`endOf()` 和 `startOf()` 相反，用于获取某个时间单位的结束时间。

例如获取今天结束：

```js
moment().endOf("day");
```text

结果是：

```text
23:59:59.999
```

获取本月结束：

```js
moment().endOf("month");
```text

获取今年结束：

```js
moment().endOf("year");
```

它常用于查询时间范围。

例如查询今天的数据：

```js
const start = moment().startOf("day").toDate();
const end = moment().endOf("day").toDate();
```text

---

## 二十三、utc()：UTC 时间

`utc()` 用来获取 UTC 时间。

```js
moment.utc().format();
```

本地时间会根据你所在时区显示，而 UTC 时间是标准世界时间。

例如印度是 UTC+5:30，中国大陆和台湾地区是 UTC+8。

如果本地时间是：

```text
2026-07-01 16:00:00
```text

那么 UTC 时间大约是：

```text
2026-07-01 08:00:00
```

具体结果取决于当前时区。

---

## 二十四、utcOffset()：获取 UTC 偏移

`utcOffset()` 用来获取当前时间相对于 UTC 的偏移分钟数。

```js
moment().utcOffset();
```text

如果你在 UTC+8 时区，返回值通常是：

```text
480
```

因为：

```text
8 小时 × 60 分钟 = 480 分钟
```text

如果在印度 UTC+5:30，则返回：

```text
330
```

---

## 二十五、unix()：Unix 时间戳，单位是秒

`unix()` 返回 Unix 时间戳，单位是秒。

```js
moment().unix();
```text

输出示例：

```text
1782892800
```

Unix 时间戳表示从 1970 年 1 月 1 日 00:00:00 UTC 到当前时间经过的秒数。

注意：`unix()` 是秒，不是毫秒。

---

## 二十六、valueOf()：时间戳，单位是毫秒

`valueOf()` 返回时间戳，单位是毫秒。

```js
moment().valueOf();
```text

输出示例：

```text
1782892800000
```

它和原生 JavaScript 的：

```js
Date.now();
```text

返回单位一致，都是毫秒。

可以简单记：

```text
unix()    秒级时间戳
valueOf() 毫秒级时间戳
```

---

## 二十七、Moment.js 基础知识总结

Moment.js 的核心用法可以概括为四类。

第一类是创建时间：

```js
moment();
moment("2026-07-01");
moment("01-07-2026", "DD-MM-YYYY");
```text

第二类是格式化时间：

```js
moment().format("YYYY-MM-DD");
moment().format("YYYY-MM-DD HH:mm:ss");
moment().format("MMMM Do, YYYY");
```

第三类是获取和设置时间：

```js
moment().year();
moment().month();
moment().date();

moment().set({
  year: 2030,
  month: 11,
  date: 25,
});
```text

第四类是时间计算：

```js
moment().add(7, "days");
moment().subtract(1, "month");
moment().startOf("day");
moment().endOf("month");
```

如果只是入门 Moment.js，可以先重点掌握：

```text
moment()
format()
add()
subtract()
get()
set()
startOf()
endOf()
unix()
valueOf()
```text

---

## 二十八、最后总结

Moment.js 的优势是 API 直观，学习成本低，尤其适合处理日期格式化、时间加减、时间戳转换等常见需求。

常用格式符可以这样记：

```text
YYYY   四位年份
YY     两位年份
M      月份数字
MM     两位月份
MMM    月份缩写
MMMM   完整月份
D      日期
DD     两位日期
Do     带序数日期
d      星期数字
ddd    星期缩写
dddd   完整星期
H/HH   24 小时制
h/hh   12 小时制
m/mm   分钟
s/ss   秒
SSS    毫秒
A      AM / PM
a      am / pm
```

在实际开发中，最常用的格式通常是：

```js
moment().format("YYYY-MM-DD");
moment().format("YYYY-MM-DD HH:mm:ss");
moment().format("YYYY/MM/DD");
moment().format("MMMM Do, YYYY");
```text

需要注意的是：

```text
1. format() 里的普通文本要用 [] 包起来。
2. month() 和 set({ month }) 使用 0-11，0 是一月，11 是十二月。
3. unix() 返回秒级时间戳。
4. valueOf() 返回毫秒级时间戳。
5. add() 和 subtract() 可以处理时间加减。
6. startOf() 和 endOf() 很适合处理查询时间范围。
```

一句话总结：

**Moment.js 的核心就是：创建一个时间对象，然后对它进行格式化、读取、设置、加减和转换。**
