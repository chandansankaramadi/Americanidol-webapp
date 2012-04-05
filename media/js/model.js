var Model;
Model = {
	controller:null,
    rounds:[],
    round:null,
    find:function(path){
        if (!(path instanceof Array)) path = path.split('.');
        else path = path.slice();
        
        var object,index,identifier;
        object = null;
        if (path.length)
        {
            identifier =  path.shift();
            if (identifier == this.options.rounds)
            {
                object = this.rounds;
                if (path.length)
                {
                    index = Number(path.shift());
                    if (! isNaN(index))
                    {
                        object = object[index];
                        if (path.length)
                        {
                            identifier = path.shift();
                            if (identifier == this.options.judges)
                            {
                                object = object.judges;
                                index = Number(path.shift());
                                if (! isNaN(index))
                                {
                                    object = object[index];
                                }
                            }
                         }
                    }
                }
            }
        }
        return object;
    },
    get:function(path){
        if (!(path instanceof Array)) path = path.split('.');
        var property = path.pop();
        var object = this.find(path);
        return object.getModelData(property);
    },
    put:function(data, path){
        var err,id,round,bits,i,z,bit,reorder;
        err = '';
        if (! data) err = 'no data';
        if (! err.length)
        {
            if (path && path.length)
            {
                bits = path.split('.');
                while(data && (bit = bits.shift()))
                {
                    data = data[bit];
                }
            }
            if (! data) err = 'invalid key: "' + path + '"';
            if (! err.length)
            {
                if (! (data instanceof Array)) data = [data];
                z = data.length;
                reorder = false;
                var update_rounds = [];
                var update_data = [];
                var inserted_rounds = 0;

                for (i = 0; ((! err.length) && (i < z)); i++)
                {
                    round = data[i];
                    if (! round) err = 'found no data in array at ' + i;
                    if (! err.length)
                    {
                        id = round.id;
                        if (! (id && id.length)) err = 'invalid identifier';
                    }
                    if (! err.length)
                    {
                        bit = this.roundFromId(id);
                        if (bit == null) { // new round
                            bit = this.__factory(round);
                            if (! (bit instanceof Object) ) console.warn('Model.put: ' + bit);
                            else
                            {
                                inserted_rounds++;
                                reorder = true;
                            }

                         }
                        else
                        {
                            update_rounds.push(bit);
                            update_data.push(round);
                        }
                    }

                }
                if (reorder && this.options.sortKey && this.options.sortKey.length) this.__sortRounds();
                this.round = this.rounds[this.rounds.length-1];
                if (inserted_rounds) //for (i = 0; i < inserted_rounds; i++)
                {
                    this.controller.modelInserted(Model.options.rounds);
                }
                z = update_data.length;
                for (i = 0; i < z; i++)
                {
                    bit = update_rounds[i];
                    round = update_data[i];
                    bit.update(round);
                }
             }
        }

         return err;

    },
    roundFromId:function(id){
        var round,i,z;
        z = this.rounds.length;
        for (i = 0; i < z; i++)
        {
            if (this.rounds[i].id == id)
            {
                round = this.rounds[i];
                break;
            }
        }
        return round;
    },
   setOptions:function(options, controller){
   		this.controller = controller;
        $.extend(true, this.options, options);
        if (! this.__initialized) this.__initialize();
    },
    __sortRounds:function(){

        var callback,rounds;
        callback = function(a,b){
            var i,z,lv,rv,bits,left,right,bit;
            bits = Model.options.sortKey.split('.');
            left = ((Model.options.sortOrder == 'desc') ? -1 : 1);
            right = ((Model.options.sortOrder == 'desc') ? 1 : -1);
            lv = a.__data;
            rv = b.__data;
            z = bits.length;
            for (i = 0; i < z; i++)
            {
                bit = bits[i];
                lv = lv[bit];
                rv = rv[bit];
                if (lv == null) return ((rv == null) ? 0 : right);
                if (rv == null) return left;
            }
            if (Model.options.sortType == 'numeric')
            {
                lv = Number(lv);
                rv = Number(rv);
                if (lv > rv) return left;
                if (lv < rv) return right;
            }
            else
            {
                switch(lv.localeCompare(rv))
                {
                    case -1: return right;
                    case 1: return left;
                }
            }
            return 0;
        };
        rounds = this.rounds.slice();
        this.rounds.sort(callback);
        if (rounds != this.rounds) this.controller.modelReordered();
    },
     __factory:function(data){
        var new_round;
        new_round = new this.__round(data);
        if (new_round)
        {
            if (new_round.error.length) new_round = new_round.error;
            else
            {
                this.rounds.push(new_round);
            }
        }
        return new_round;
    },
    __initialize:function() {
        /* JUDGES and COMPETITORS */
        this.__participant.prototype.updateData = function(data){

            var key;
            var keys = {};
            for (key in data)
            {
            	if ((key == 'id') || (key == 'type')) continue;
            	if (this.setModelData(key, data[key]))
            	{
            		
            	
					if (this.isCompetitor)
					{	
						switch(key)
						{
							case Model.options.competitorKeyNay:
							case Model.options.competitorKeyYay:
							{
								keys[Model.options.competitorMeterNay] = true;
								keys[Model.options.competitorMeterYay] = true;
							}	
							default: keys[key] = true;
						}
					}
					else
					{
						switch(key)
						{
							case Model.options.judgeKeyNay:
							case Model.options.judgeKeyYay:
							{
								keys[Model.options.judgeMeterNay] = true;
								keys[Model.options.judgeMeterYay] = true;
							}	
							default: keys[key] = true;
						}
					
					}
				}
            }
            for (key in keys)
            {
                Model.controller.modelUpdated(this.getPath(key));
            }
        };
        this.__participant.prototype.getModelData = function(key){
            return this.__data[key];
        };
        this.__participant.prototype.getPath = function(component){
            var path = this.round.getPath();
            if (! this.isCompetitor) path += '.' + Model.options.judges + '.' + this.round.judges.indexOf(this);
            if (component && component.length) path += '.' + component;   
            return path;
        };
        this.__participant.prototype.setModelData = this.__setData;
        this.__participant.prototype.getPercentage = this.__getPercentage;
        this.__participant.prototype.incrementModelData = this.__incrementData;
        this.__participant.prototype.id = '';
        this.__participant.prototype.isCompetitor = false;
        this.__participant.prototype.round = null;
        this.__participant.prototype.__data = null;

        /* ROUNDS */
        this.__round.prototype.id = '';
        this.__round.prototype.error = '';
        this.__round.prototype.judges = null;
        this.__round.prototype.competitor = null;
        this.__round.prototype.__data = null;
        this.__round.prototype.getModelData = function(key){
            return ((this.competitor.__data[key] == null) ? this.__data[key] : this.competitor.__data[key]);
        };
        this.__round.prototype.updateData = function(data){
            var key;
            var keys = {};
            for (key in data)
            {
                switch(key)
                {
                    case 'id':
                    case 'participants':break;
                    default: if (this.setModelData(key, data[key])) keys[key] = true;
                }
            }
            for (key in keys)
            {
                Model.controller.modelUpdated(this.getPath(key));
            }
        }
        this.__round.prototype.update = function(data){
            var i,z,object, participant;
			this.updateData(data);
            z = data.participants.length;
            for(i = 0; i < z; i++)
            {
                object = null;
                participant = data.participants[i];
                switch(participant.type)
                {
                    case Model.options.judge:
                    {
                        object = this.judgeFromId(participant.id);
                        break;
                    }
                    case Model.options.competitor:
                    {
                        if (this.competitor.getModelData('id') == participant.id)
                        {
                            object = this.competitor;
                        }
                        break;
                    }
                }
                if (object != null)
                {
                    object.updateData(participant);
                }
            }
        };
        this.__round.prototype.judgeFromId = function(id){
            var i, z, participant;
            if (this.judges)
            {
                z = this.judges.length;
                for (i =0; i < z; i++)
                {
                    if (this.judges[i].id == id)
                    {
                        participant = this.judges[i];
                        break;
                    }
                }
            }
            return participant;
        };
        this.__round.prototype.participantsOfType = function(type){
            var participants = [];
            var i, z, participant;
            if (this.__data && this.__data.participants)
            {
                if ((type == null) || (! type.length)) type = Model.options.judge;
                z = this.__data.participants.length;
                for (i =0; i < z; i++)
                {
                    participant = this.__data.participants[i];
                    if (participant.type == type) participants.push(participant);
                }
            }
            return participants;
        };
        this.__round.prototype.getPath = function(component){
            var path = Model.options.rounds + '.' + Model.rounds.indexOf(this);
            if (component && component.length) path += '.' + component;
            return path;
        };
        this.__round.prototype.round = null;
        this.__round.prototype.getPercentage =this.__getPercentage;
        this.__round.prototype.setModelData = this.__setData;
        this.__initialized = true;
    },
    __participant:function(data, round, competitor){
        this.isCompetitor = competitor;
        this.__data = data;
        this.id = data.id;
        this.round = round;
    },
    __round:function(data){
        this.isCompetitor = true;
        this.judges = [];
        this.round = this;
        this.__data = data;
        this.id = data.id;
        var competitors, judges, count, i;
        competitors = [];
        judges = [];
        switch (this.__data.type)
        {
            case Model.options.competitor:
            {
                competitors.push(data);
                break;
            }
            case Model.options.judge:
            {
                judges.push(data);
                break;
            }
        }
        if (! judges.length) judges = this.participantsOfType(Model.options.judge);

        count = judges.length;
        for (i = 0; i < count; i++)
        {
            this.judges.push(new Model.__participant(judges[i], this, false));
        }
        if (Model.__judgeCount == -1) Model.__judgeCount = this.judges.length;
        else if (Model.__judgeCount != this.judges.length) this.error = 'wrong number of judges, needed ' + Model.__judgeCount;

        if (! competitors.length) competitors = this.participantsOfType(Model.options.competitor);
        count = competitors.length;
        if (count) this.competitor = new Model.__participant(competitors.shift(), this, true);
        else this.error = 'no competitor for round ' + this.id;
    },

    __setData:function(key, value){
    	var different = (this.__data[key] != value);
        if (different) this.__data[key] = value;
		return different;
    },
    __getPercentage:function(){
        var percentage,nay_key,yay_key,yay,nay;

        nay_key = (this.isCompetitor ? Model.options.competitorKeyNay : Model.options.judgeKeyNay);
        yay_key = (this.isCompetitor ? Model.options.competitorKeyYay : Model.options.judgeKeyYay);

        nay = Number(this.getModelData(nay_key));
        yay = Number(this.getModelData(yay_key));


        if (isNaN(nay)) nay = 0;
        if (isNaN(yay)) yay = 0;
        percentage = ((nay != yay) ? Math.round(yay * 100 / (nay + yay)) : 50);
        return percentage;

    },
    __incrementData: function(key){
        var value = this.getModelData(key);
        if (! value) value = 0;
        else
        {
            value = Number(value);
            if (isNaN(value)) value = 0;
        }
        this.setModelData(key, value + 1);
    },
    __judgeCount:-1,
    __initialized:false,
    options:{
        competitorKeyNay: 'totalBoos',
        competitorKeyYay: 'totalCheers',
        judgeKeyNay: 'totalBoos',
        judgeKeyYay: 'totalCheers',
 
 
		competitorMeterNay: 'competitor_meter_nay',
        competitorMeterYay: 'competitor_meter_yay',
        judgeMeterNay: 'judge_meter_nay',
        judgeMeterYay: 'judge_meter_yay',
 
 
 
        competitor: 'competitor',
        judge: 'judge',
        judges:'judges',
        rounds:'rounds',
        sortKey:'',
        sortOrder:'asc',
        sortType:'numeric',
        voting: 'voting'
    }
};
