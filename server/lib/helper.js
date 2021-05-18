class Helper {

  /**
   * Create unique id. It's combination of timestamp and random number 'r'
   * in format: YYMMDDHHmmssSSSrrr ---> YY year, MM month, DD day, HH hour, mm min, ss sec, SSS ms, rrr 3 random digits
   * 18 digits in total, for example: 210129163129492100
   * @returns {number}
   */
  generateID() {
    const rnd = Math.random() * 1000;
    const rrr = Math.floor(rnd);

    const timestamp = new Date();
    const tsp = timestamp.toISOString()
      .replace(/^20/, '')
      .replace(/\-/g, '')
      .replace(/\:/g, '')
      .replace('T', '')
      .replace('Z', '')
      .replace('.', '');

    const id = +(tsp + rrr);
    return id;
  }


  /**
   * Gives now time in nice format -> Friday, 1/29/2021, 16:31:29.801
   * @returns {string}
   */
  nowTime() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-us', {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      fractionalSecondDigits: 3,
      hour12: false,
      timeZone: 'UTC'
    });
    return formatter.format(now);
  }


  /**
   * Pause the code execution
   * @param {number} ms - miliseconds
   * @returns {Promise}
   */
  async sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }



  /**
   * Print all buffer values as string.
   * For example: 81 7e 00 8b 7b 22 69 64 22 3a 32 31 30 32 31 34 31 30
   * @param {Buffer} buff
   * @returns {void}
   */
  printBuffer(buff) {
    console.log(buff.toString('hex').match(/../g).join(' '));
  }


}




module.exports = new Helper();
