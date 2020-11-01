async function isFirstSetup(database){
  return new Promise(async (resolve, reject) => {
    try {
      await database.get("is_first_setup")
      resolve(false)
    } catch (e) {
      if (e.name == 'NotFoundError'){
        resolve(true)
      } else {
        reject(e)
      }
    }
  })
}

module.exports.check = isFirstSetup
